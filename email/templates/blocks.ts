import { escapeHtml, money, sectionLabel, TOKENS } from './layout';
import type { OrderLineItem, ShippingAddress } from '../types';

/**
 * The reusable pieces of an email body.
 *
 * The customer and admin order emails were previously two ~120-line copies of
 * the same markup, so any change had to be made twice and they had already
 * drifted apart. Both now assemble from these blocks.
 */

/** The variant a customer actually chose, however the cart happened to store it. */
function variantLabel(item: OrderLineItem): string {
  const variant = item.variant;
  if (!variant) return '';
  return variant.size || variant.color || variant.name || '';
}

export function itemsList(items: OrderLineItem[]): string {
  const rows = items
    .map(item => {
      const label = variantLabel(item);
      return `
        <p style="font-size:14px;line-height:1.4;margin:0 0 5px 0;padding-bottom:5px;border-bottom:1px solid ${TOKENS.cardBorder};color:${TOKENS.text};">
          <span style="background-color:#000000;color:#ffffff;padding:1px 5px;border-radius:3px;font-weight:bold;margin-right:6px;">${escapeHtml(String(item.quantity))}x</span>
          <strong style="text-decoration:underline;font-size:15px;">${escapeHtml(item.name)}</strong>
          ${label ? `<br><span style="color:${TOKENS.muted};font-size:12px;margin-left:30px;">Variant: ${escapeHtml(label)}</span>` : ''}
        </p>`;
    })
    .join('');

  return `
    <div style="background-color:${TOKENS.pageBg};padding:10px 14px;border-left:4px solid ${TOKENS.accent};">
      ${rows}
    </div>`;
}

export function addressBlock(
  customerName: string,
  address: ShippingAddress,
  label = 'Shipping to'
): string {
  const line2 = [address.address, address.apartment].filter(Boolean).map(escapeHtml).join(', ');
  const line3 = [address.city, address.governorate].filter(Boolean).map(escapeHtml).join(', ');

  return `
    ${sectionLabel(label)}
    <div style="background-color:${TOKENS.pageBg};padding:10px 14px;border-left:4px solid #000000;">
      <p style="margin:0;padding:0;font-size:14px;line-height:1.5;color:${TOKENS.text};">
        <strong>${escapeHtml(customerName)}</strong><br>
        ${line2}${line2 ? '<br>' : ''}
        ${line3}${line3 ? '<br>' : ''}
        Egypt
      </p>
    </div>`;
}

export function contactBlock(name: string, phone: string, email: string, notes?: string): string {
  return `
    ${sectionLabel('Customer')}
    <div style="background-color:${TOKENS.pageBg};padding:10px 14px;border-left:4px solid #000000;">
      <p style="margin:0;padding:0;font-size:14px;line-height:1.5;color:${TOKENS.text};">
        <strong>${escapeHtml(name)}</strong><br>
        <a href="tel:${escapeHtml(phone)}" style="color:${TOKENS.link};text-decoration:underline;">${escapeHtml(phone)}</a><br>
        <a href="mailto:${escapeHtml(email)}" style="color:${TOKENS.link};text-decoration:underline;">${escapeHtml(email)}</a>
      </p>
      ${
        notes
          ? `<p style="margin:8px 0 0 0;padding:0;font-size:13px;line-height:1.4;color:${TOKENS.text};"><strong>Note:</strong> ${escapeHtml(notes)}</p>`
          : ''
      }
    </div>`;
}

export interface TotalsInput {
  subtotal: number;
  shippingCost: number;
  codFee?: number;
  discountAmount?: number;
  promoCode?: string;
  totalAmount: number;
  /** Overrides the "Total" wording, e.g. "Amount to pay". */
  totalLabel?: string;
}

function totalsRow(label: string, value: string, muted = true): string {
  return `
    <tr>
      <td style="padding:3px 0;font-size:13px;line-height:1.4;color:${muted ? TOKENS.muted : TOKENS.text};">${label}</td>
      <td style="padding:3px 0;font-size:13px;line-height:1.4;color:${TOKENS.text};text-align:right;white-space:nowrap;">${value}</td>
    </tr>`;
}

export function totalsTable(input: TotalsInput): string {
  const discount = input.discountAmount ?? 0;
  const cod = input.codFee ?? 0;

  return `
    <div style="border-top:2px solid ${TOKENS.rule};border-bottom:2px solid ${TOKENS.rule};padding:10px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      ${totalsRow('Subtotal', money(input.subtotal))}
      ${totalsRow('Shipping', money(input.shippingCost))}
      ${cod > 0 ? totalsRow('Cash on delivery fee', money(cod)) : ''}
      ${
        discount > 0
          ? totalsRow(
              `Discount${input.promoCode ? ` (${escapeHtml(input.promoCode)})` : ''}`,
              `−${money(discount)}`
            )
          : ''
      }
      <tr>
        <td style="padding:6px 0;font-size:15px;line-height:1.4;font-weight:bold;color:${TOKENS.text};border-top:2px solid #000000;">${escapeHtml(input.totalLabel ?? 'Total')}</td>
        <td style="padding:6px 0;font-size:15px;line-height:1.4;font-weight:bold;color:${TOKENS.text};text-align:right;white-space:nowrap;border-top:2px solid #000000;">${money(input.totalAmount)}</td>
      </tr>
    </table>
    </div>`;
}

export function detailLine(label: string, value: string): string {
  return `<p style="margin:0;padding:0;font-size:13px;line-height:1.4;color:${TOKENS.text};"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}

/** The one call to action an email should ever have — a plain bold black link. */
export function button(label: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${TOKENS.text};text-decoration:none;font-weight:bold;font-size:16px;">${escapeHtml(label)}</a>`;
}

/** Human-readable payment method, from the value stored on the order. */
export function paymentMethodLabel(method: string): string {
  if (method === 'cashOnDelivery') return 'Cash on delivery';
  if (method === 'instaPay' || method === 'instapay') return 'InstaPay';
  return method || 'Not specified';
}

/** The plain-text half of every email — required, or spam filters mark us down. */
export function itemsAsText(items: OrderLineItem[]): string {
  return items
    .map(item => {
      const label = variantLabel(item);
      return `- ${item.name}${label ? ` (${label})` : ''} x${item.quantity}`;
    })
    .join('\n');
}
