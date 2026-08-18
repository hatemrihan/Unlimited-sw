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
        <tr>
          <td style="padding:10px 0;font-size:15px;line-height:1.5;color:${TOKENS.text};vertical-align:top;">
            ${escapeHtml(item.name)}${label ? `<br><span style="font-size:13px;color:${TOKENS.muted};">${escapeHtml(label)}</span>` : ''}
          </td>
          <td style="padding:10px 0 10px 16px;font-size:14px;line-height:1.5;color:${TOKENS.muted};text-align:right;white-space:nowrap;vertical-align:top;">
            ×${escapeHtml(String(item.quantity))}
          </td>
        </tr>`;
    })
    .join('');

  return `
    ${sectionLabel('Items')}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      ${rows}
    </table>`;
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
    <p style="margin:0;padding:0;font-size:15px;line-height:1.7;color:${TOKENS.text};">
      ${escapeHtml(customerName)}<br>
      ${line2}${line2 ? '<br>' : ''}
      ${line3}${line3 ? '<br>' : ''}
      Egypt
    </p>`;
}

export function contactBlock(name: string, phone: string, email: string, notes?: string): string {
  return `
    ${sectionLabel('Customer')}
    <p style="margin:0;padding:0;font-size:15px;line-height:1.7;color:${TOKENS.text};">
      ${escapeHtml(name)}<br>
      <a href="tel:${escapeHtml(phone)}" style="color:${TOKENS.text};text-decoration:none;">${escapeHtml(phone)}</a><br>
      <a href="mailto:${escapeHtml(email)}" style="color:${TOKENS.text};text-decoration:none;">${escapeHtml(email)}</a>
    </p>
    ${
      notes
        ? `<p style="margin:14px 0 0 0;padding:0;font-size:14px;line-height:1.6;color:${TOKENS.muted};"><span style="color:${TOKENS.faint};">Note:</span> ${escapeHtml(notes)}</p>`
        : ''
    }`;
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
      <td style="padding:7px 0;font-size:14px;line-height:1.5;color:${muted ? TOKENS.muted : TOKENS.text};">${label}</td>
      <td style="padding:7px 0;font-size:14px;line-height:1.5;color:${TOKENS.text};text-align:right;white-space:nowrap;">${value}</td>
    </tr>`;
}

export function totalsTable(input: TotalsInput): string {
  const discount = input.discountAmount ?? 0;
  const cod = input.codFee ?? 0;

  return `
    ${sectionLabel('Summary')}
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
        <td colspan="2" style="padding:0;"><div style="height:1px;line-height:1px;font-size:0;background-color:${TOKENS.rule};margin:10px 0;">&nbsp;</div></td>
      </tr>
      <tr>
        <td style="padding:2px 0;font-size:15px;line-height:1.5;font-weight:600;color:${TOKENS.text};">${escapeHtml(input.totalLabel ?? 'Total')}</td>
        <td style="padding:2px 0;font-size:15px;line-height:1.5;font-weight:600;color:${TOKENS.text};text-align:right;white-space:nowrap;">${money(input.totalAmount)}</td>
      </tr>
    </table>`;
}

export function detailLine(label: string, value: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:0;font-size:14px;line-height:1.6;color:${TOKENS.muted};">${escapeHtml(label)}</td>
        <td style="padding:0;font-size:14px;line-height:1.6;color:${TOKENS.text};text-align:right;">${escapeHtml(value)}</td>
      </tr>
    </table>`;
}

/** A quiet outlined button — the one call to action an email should ever have. */
export function button(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td style="border:1px solid ${TOKENS.text};">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;color:${TOKENS.text};text-decoration:none;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
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
