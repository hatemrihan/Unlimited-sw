import type { OrderEmailData, OrderLineItem } from './types';

/**
 * Turns a saved order (plus the raw checkout payload) into the shape the
 * templates expect.
 *
 * This mapping lived inside emailQueueService, where it made an already busy
 * function harder to follow. It belongs here: it is knowledge about what an
 * email needs, not about how orders are processed.
 */

// `savedOrder` is a Mongoose document and `orderData` the raw checkout payload;
// neither has a shared type today, so both arrive loosely typed and this file is
// where they become a known shape.
type LooseOrder = Record<string, unknown> & { [key: string]: any };

function toLineItem(product: LooseOrder): OrderLineItem {
  // variantName is the canonical value stock was decremented against;
  // size/color are the legacy flattened forms, kept for older orders.
  const label = product.variantName || product.size || product.color || '';

  return {
    name: product.name,
    quantity: product.quantity,
    price: product.price * product.quantity,
    variant: label
      ? { name: label, size: product.size || '', color: product.color || '' }
      : undefined,
  };
}

export function orderEmailDataFrom(savedOrder: LooseOrder, orderData: LooseOrder): OrderEmailData {
  const fullName: string = savedOrder.customer.name ?? '';
  const customer = orderData?.customer ?? {};

  return {
    customerEmail: savedOrder.customer.email,
    customerName: fullName,
    customerFirstName: customer.firstName || fullName.split(' ')[0] || '',
    customerLastName: customer.lastName || fullName.split(' ').slice(1).join(' ') || '',
    orderId: savedOrder.orderId,
    orderItems: (savedOrder.products ?? []).map(toLineItem),
    totalAmount: savedOrder.totalAmount,
    subtotal: savedOrder.subtotal || 0,
    shippingCost: savedOrder.shippingCost,
    codFee: savedOrder.codFee || 0,
    paymentMethod: savedOrder.paymentMethod,
    shippingAddress: {
      governorate: customer.governorate || '',
      city: customer.city || '',
      address: customer.address || savedOrder.customer.address,
      apartment: customer.apartment || '',
    },
    customerPhone: savedOrder.customer.phone,
    customerNotes: orderData?.notes || '',
    promoCode: orderData?.promoCode || '',
    discountAmount: orderData?.discountAmount || 0,
  };
}
