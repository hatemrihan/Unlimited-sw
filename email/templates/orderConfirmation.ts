import { layout, paragraph, rule, escapeHtml, money } from './layout';
import {
  itemsList,
  addressBlock,
  totalsTable,
  detailLine,
  button,
  paymentMethodLabel,
  itemsAsText,
} from './blocks';
import { BRAND } from '../config';
import type { EmailMessage, OrderEmailData } from '../types';

/** Falls back to the first word of the full name when the split name is absent. */
function firstName(order: OrderEmailData): string {
  return order.customerFirstName?.trim() || order.customerName.split(' ')[0] || 'there';
}

/**
 * The subtotal is stored on newer orders. For older ones it is derived from the
 * parts, so the summary always adds up rather than showing a blank line.
 */
function resolveSubtotal(order: OrderEmailData): number {
  if (typeof order.subtotal === 'number' && order.subtotal > 0) return order.subtotal;
  return (
    order.totalAmount - order.shippingCost - (order.codFee ?? 0) + (order.discountAmount ?? 0)
  );
}

/** The confirmation a customer receives immediately after placing an order. */
export function orderConfirmationEmail(order: OrderEmailData): EmailMessage {
  const subtotal = resolveSubtotal(order);

  const body = `
    ${paragraph(`Hi ${escapeHtml(firstName(order))}, thank you for your order. Everything below is confirmed and we are preparing it now.`)}

    ${rule()}
    ${itemsList(order.orderItems)}

    ${rule()}
    ${addressBlock(order.customerName, order.shippingAddress)}

    ${rule()}
    ${totalsTable({
      subtotal,
      shippingCost: order.shippingCost,
      codFee: order.codFee,
      discountAmount: order.discountAmount,
      promoCode: order.promoCode,
      totalAmount: order.totalAmount,
    })}

    ${rule(8)}
    ${detailLine('Payment', paymentMethodLabel(order.paymentMethod))}

    ${rule()}
    ${paragraph('We will be in touch as soon as your order is on its way. Reply to this email if anything looks wrong.')}

    ${rule(16)}
    ${button('Continue shopping', BRAND.shopUrl)}
  `;

  const text = `Hi ${firstName(order)},

Thank you for your order. Order #${order.orderId} is confirmed.

ITEMS
${itemsAsText(order.orderItems)}

SHIPPING TO
${order.customerName}
${[order.shippingAddress.address, order.shippingAddress.apartment].filter(Boolean).join(', ')}
${[order.shippingAddress.city, order.shippingAddress.governorate].filter(Boolean).join(', ')}
Egypt

SUMMARY
Subtotal: ${money(subtotal)}
Shipping: ${money(order.shippingCost)}${order.codFee ? `\nCash on delivery fee: ${money(order.codFee)}` : ''}${order.discountAmount ? `\nDiscount${order.promoCode ? ` (${order.promoCode})` : ''}: -${money(order.discountAmount)}` : ''}
Total: ${money(order.totalAmount)}

Payment: ${paymentMethodLabel(order.paymentMethod)}

We will be in touch as soon as your order is on its way.

${BRAND.name} · ${BRAND.siteUrl}`;

  return {
    to: order.customerEmail,
    subject: `Order #${order.orderId} confirmed`,
    html: layout({
      preheader: `Your order is confirmed — ${money(order.totalAmount)}`,
      title: `Order #${order.orderId}`,
      subtitle: 'Confirmed',
      body,
    }),
    text,
  };
}
