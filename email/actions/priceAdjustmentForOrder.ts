import dbConnect from '../../lib/mongodb';
import Order from '@/order/model';
import { sendPriceAdjustmentEmail } from '../index';
import { isValidEmailAddress } from '../send';
import type { PriceAdjustmentData } from '../types';
import { logger } from '../../utils/logger';

/**
 * "Tell the customer of order X that their total was wrong."
 *
 * This is the whole job — reading the order, checking it makes sense, and
 * sending. It lives here rather than in the API route because it is email work,
 * not web work: the route is only an address, and a second caller (an admin
 * button, a script, a future coach-app dashboard) should not have to reimplement
 * any of this.
 *
 * `templates/` stays pure — data in, HTML out, no database. `actions/` is the
 * layer that is allowed to fetch data and orchestrate a send.
 */

export type PriceAdjustmentOutcome =
  | { ok: true; orderId: string; previousTotal: number; correctedTotal: number; messageId: string | null }
  | { ok: false; status: 404 | 422 | 502; error: string };

interface StoredOrder {
  orderId: string;
  customer: { name: string; email: string };
  products: Array<{
    name: string;
    quantity: number;
    price: number;
    variantName?: string;
    size?: string;
    color?: string;
  }>;
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  codFee?: number;
  discountAmount?: number;
  promoCode?: string;
  paymentMethod: string;
}

export async function sendPriceAdjustmentForOrder(input: {
  orderId: string;
  correctedTotal: number;
  reason?: string;
}): Promise<PriceAdjustmentOutcome> {
  const { orderId, correctedTotal, reason } = input;

  await dbConnect();
  const order = await Order.findOne({ orderId }).lean<StoredOrder>();

  if (!order) {
    return { ok: false, status: 404, error: `Order ${orderId} not found.` };
  }

  // The recipient always comes from the order, never from the caller. That is
  // what stops this being usable as a way to mail arbitrary strangers.
  if (!isValidEmailAddress(order.customer?.email)) {
    return { ok: false, status: 422, error: `Order ${orderId} has no usable customer email.` };
  }

  if (correctedTotal === order.totalAmount) {
    return {
      ok: false,
      status: 422,
      error: 'The corrected total matches the order total — there is nothing to correct.',
    };
  }

  const data: PriceAdjustmentData = {
    customerEmail: order.customer.email,
    customerName: order.customer.name,
    orderId: order.orderId,
    orderItems: order.products.map(product => {
      const label = product.variantName || product.size || product.color;
      return {
        name: product.name,
        quantity: product.quantity,
        price: product.price * product.quantity,
        variant: label
          ? { name: label, size: product.size ?? '', color: product.color ?? '' }
          : undefined,
      };
    }),
    previousTotal: order.totalAmount,
    correctedTotal,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    codFee: order.codFee,
    discountAmount: order.discountAmount,
    promoCode: order.promoCode,
    paymentMethod: order.paymentMethod,
    reason,
  };

  const result = await sendPriceAdjustmentEmail(data);

  if (!result.success) {
    return { ok: false, status: 502, error: result.error };
  }

  logger.info('Price adjustment sent', { orderId, previousTotal: order.totalAmount, correctedTotal });

  return {
    ok: true,
    orderId: order.orderId,
    previousTotal: order.totalAmount,
    correctedTotal,
    messageId: result.messageId,
  };
}
