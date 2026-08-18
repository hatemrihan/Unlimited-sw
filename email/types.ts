/**
 * The shapes every email in this folder speaks.
 *
 * Templates take one of these and return HTML. They never touch the database,
 * never know Brevo exists, and never send anything.
 */

export interface OrderLineItem {
  name: string;
  quantity: number;
  /** Line total (unit price x quantity), not the unit price. */
  price: number;
  variant?: {
    name: string;
    size: string;
    color: string;
  };
}

export interface ShippingAddress {
  governorate: string;
  city: string;
  address: string;
  apartment?: string;
}

export interface OrderEmailData {
  customerEmail: string;
  customerName: string;
  customerFirstName?: string;
  customerLastName?: string;
  orderId: string;
  orderItems: OrderLineItem[];
  totalAmount: number;
  subtotal?: number;
  shippingCost: number;
  codFee?: number;
  paymentMethod: string;
  shippingAddress: ShippingAddress;
  customerPhone: string;
  customerNotes?: string;
  promoCode?: string;
  discountAmount?: number;
}

/**
 * A correction sent when an order's total was charged or displayed wrongly.
 *
 * Everything here is passed in per-order. The old version had one customer's
 * products and totals hardcoded into the HTML, so every recipient got the same
 * stranger's numbers.
 */
export interface PriceAdjustmentData {
  customerEmail: string;
  customerName: string;
  orderId: string;
  orderItems: OrderLineItem[];
  /** What the customer was originally shown or charged. */
  previousTotal: number;
  /** What they should actually pay. */
  correctedTotal: number;
  subtotal: number;
  shippingCost: number;
  codFee?: number;
  discountAmount?: number;
  promoCode?: string;
  paymentMethod: string;
  /** Optional plain-language sentence explaining the correction. */
  reason?: string;
}

/** What a template hands to the sender. */
export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  /** Always required — a mail with no plain-text part scores as spam. */
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export type SendResult =
  | { success: true; messageId: string; skipped?: false }
  | { success: true; messageId: null; skipped: true; reason: string }
  | { success: false; error: string };
