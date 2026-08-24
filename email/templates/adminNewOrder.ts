import { layout, paragraph, rule, money } from './layout';
import {
  itemsList,
  addressBlock,
  contactBlock,
  totalsTable,
  detailLine,
  button,
  paymentMethodLabel,
  itemsAsText,
} from './blocks';
import { BRAND } from '../config';
import type { EmailMessage, OrderEmailData } from '../types';

/**
 * The internal alert sent to the team when an order arrives.
 *
 * Written in English throughout. The previous version mixed Arabic headings with
 * English tables inside one left-to-right document, which left sentences broken
 * across directions. If this should be Arabic, it needs `dir: 'rtl'` and all of
 * its copy translated — a deliberate choice, not a half-measure.
 */
export function adminNewOrderEmail(order: OrderEmailData, to: string[]): EmailMessage {
  const subtotal =
    typeof order.subtotal === 'number' && order.subtotal > 0
      ? order.subtotal
      : order.totalAmount - order.shippingCost - (order.codFee ?? 0) + (order.discountAmount ?? 0);

  const body = `
    ${paragraph('A new order needs processing.')}

    ${rule()}
    ${contactBlock(order.customerName, order.customerPhone, order.customerEmail, order.customerNotes)}

    ${rule()}
    ${itemsList(order.orderItems)}

    ${rule()}
    ${addressBlock(order.customerName, order.shippingAddress, 'Deliver to')}

    ${rule()}
    ${totalsTable({
      subtotal,
      shippingCost: order.shippingCost,
      codFee: order.codFee,
      discountAmount: order.discountAmount,
      promoCode: order.promoCode,
      totalAmount: order.totalAmount,
      totalLabel: 'Collect',
    })}

    ${rule(8)}
    ${detailLine('Payment', paymentMethodLabel(order.paymentMethod))}

    ${rule(16)}
    ${button('Open dashboard', BRAND.adminUrl)}
  `;

  const text = `New order #${order.orderId}

CUSTOMER
${order.customerName}
${order.customerPhone}
${order.customerEmail}${order.customerNotes ? `\nNote: ${order.customerNotes}` : ''}

ITEMS
${itemsAsText(order.orderItems)}

DELIVER TO
${[order.shippingAddress.address, order.shippingAddress.apartment].filter(Boolean).join(', ')}
${[order.shippingAddress.city, order.shippingAddress.governorate].filter(Boolean).join(', ')}
Egypt

SUMMARY
Subtotal: ${money(subtotal)}
Shipping: ${money(order.shippingCost)}${order.codFee ? `\nCash on delivery fee: ${money(order.codFee)}` : ''}${order.discountAmount ? `\nDiscount${order.promoCode ? ` (${order.promoCode})` : ''}: -${money(order.discountAmount)}` : ''}
Collect: ${money(order.totalAmount)}

Payment: ${paymentMethodLabel(order.paymentMethod)}

Dashboard: ${BRAND.adminUrl}`;

  return {
    to,
    subject: `New order #${order.orderId} — ${money(order.totalAmount)}`,
    // Replies go to the customer, so the team can answer straight from the alert.
    replyTo: order.customerEmail,
    html: layout({
      preheader: `${order.customerName} — ${order.orderItems.length} item(s), ${money(order.totalAmount)}`,
      title: `New order #${order.orderId}`,
      subtitle: `${order.orderItems.length} item(s) · ${paymentMethodLabel(order.paymentMethod)}`,
      body,
      footerLinks: [
        { label: 'Dashboard', href: BRAND.adminUrl },
        { label: 'Store', href: BRAND.siteUrl },
      ],
    }),
    text,
  };
}
