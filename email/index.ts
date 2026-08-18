import { sendEmail } from './send';
import { adminRecipients } from './recipients';
import { orderConfirmationEmail } from './templates/orderConfirmation';
import { adminNewOrderEmail } from './templates/adminNewOrder';
import { priceAdjustmentEmail } from './templates/priceAdjustment';
import type { OrderEmailData, PriceAdjustmentData, SendResult } from './types';

/**
 * The public face of the email folder. Everywhere else in the app imports from
 * here and nothing deeper, so the internals stay free to change.
 */

export type { OrderEmailData, PriceAdjustmentData, SendResult } from './types';

/** Confirmation to the customer who placed the order. */
export function sendOrderConfirmationEmail(order: OrderEmailData): Promise<SendResult> {
  return sendEmail(orderConfirmationEmail(order), `order-confirmation:${order.orderId}`);
}

/** Alert to the team that an order arrived. */
export function sendAdminNotificationEmail(order: OrderEmailData): Promise<SendResult> {
  return sendEmail(adminNewOrderEmail(order, adminRecipients()), `admin-new-order:${order.orderId}`);
}

/** Correction to a customer whose order total was wrong. */
export function sendPriceAdjustmentEmail(data: PriceAdjustmentData): Promise<SendResult> {
  return sendEmail(priceAdjustmentEmail(data), `price-adjustment:${data.orderId}`);
}
