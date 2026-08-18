import { layout, paragraph, rule, escapeHtml, money, sectionLabel, TOKENS } from './layout';
import { itemsList, totalsTable, detailLine, paymentMethodLabel, itemsAsText } from './blocks';
import { BRAND } from '../config';
import type { EmailMessage, PriceAdjustmentData } from '../types';

/**
 * Tells a customer their order total was corrected.
 *
 * Every number here arrives as data. The version this replaces had one
 * customer's products and totals ("6,686 LE instead of 6,781 LE") written into
 * the HTML, so it could only ever tell the truth to a single person — anyone
 * else received a stranger's figures.
 */
export function priceAdjustmentEmail(data: PriceAdjustmentData): EmailMessage {
  const difference = data.previousTotal - data.correctedTotal;
  const isRefundDirection = difference > 0;
  const firstName = data.customerName.split(' ')[0] || 'there';

  const changeSummary = `
    ${sectionLabel('Correction')}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:7px 0;font-size:14px;line-height:1.5;color:${TOKENS.muted};">Previously shown</td>
        <td style="padding:7px 0;font-size:14px;line-height:1.5;color:${TOKENS.muted};text-align:right;white-space:nowrap;text-decoration:line-through;">${money(data.previousTotal)}</td>
      </tr>
      <tr>
        <td style="padding:7px 0;font-size:15px;line-height:1.5;font-weight:600;color:${TOKENS.text};">Correct total</td>
        <td style="padding:7px 0;font-size:15px;line-height:1.5;font-weight:600;color:${TOKENS.text};text-align:right;white-space:nowrap;">${money(data.correctedTotal)}</td>
      </tr>
    </table>`;

  const explanation = data.reason
    ? escapeHtml(data.reason)
    : `The total shown at checkout was calculated incorrectly. We have corrected it, and the amount below is what applies to your order.`;

  const instruction = isRefundDirection
    ? `Please pay <strong>${money(data.correctedTotal)}</strong> rather than ${money(data.previousTotal)}. Our delivery team has already been told.`
    : `The amount due is <strong>${money(data.correctedTotal)}</strong>. Our delivery team has already been told.`;

  const body = `
    ${paragraph(`Hi ${escapeHtml(firstName)}, we need to correct the total on your order.`)}
    ${paragraph(explanation, 14)}

    ${rule()}
    ${changeSummary}

    ${rule()}
    ${itemsList(data.orderItems)}

    ${rule()}
    ${totalsTable({
      subtotal: data.subtotal,
      shippingCost: data.shippingCost,
      codFee: data.codFee,
      discountAmount: data.discountAmount,
      promoCode: data.promoCode,
      totalAmount: data.correctedTotal,
      totalLabel: 'Amount to pay',
    })}

    <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
    ${detailLine('Payment', paymentMethodLabel(data.paymentMethod))}

    ${rule()}
    ${paragraph(instruction)}
    ${paragraph('We are sorry for the confusion. Reply to this email if anything is still unclear.', 14)}
  `;

  const text = `Hi ${firstName},

We need to correct the total on order #${data.orderId}.

${data.reason ?? 'The total shown at checkout was calculated incorrectly. We have corrected it, and the amount below is what applies to your order.'}

Previously shown: ${money(data.previousTotal)}
Correct total: ${money(data.correctedTotal)}

ITEMS
${itemsAsText(data.orderItems)}

SUMMARY
Subtotal: ${money(data.subtotal)}
Shipping: ${money(data.shippingCost)}${data.codFee ? `\nCash on delivery fee: ${money(data.codFee)}` : ''}${data.discountAmount ? `\nDiscount${data.promoCode ? ` (${data.promoCode})` : ''}: -${money(data.discountAmount)}` : ''}
Amount to pay: ${money(data.correctedTotal)}

Payment: ${paymentMethodLabel(data.paymentMethod)}

We are sorry for the confusion.

${BRAND.name} · ${BRAND.siteUrl}`;

  return {
    to: data.customerEmail,
    subject: `Correction to your order #${data.orderId}`,
    html: layout({
      preheader: `The correct total is ${money(data.correctedTotal)}`,
      title: `Order #${data.orderId}`,
      subtitle: 'Total corrected',
      body,
    }),
    text,
  };
}
