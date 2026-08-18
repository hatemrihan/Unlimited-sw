/**
 * Every fixed value the emails share — sender identity, brand, links, currency.
 *
 * These used to be copy-pasted into four files, so a footer change meant four
 * edits and the copyright year disagreed with itself. One file now owns them.
 */

export const SENDER = {
  name: 'UNLIMITED-SW Store',
  /** Must be an address on a domain Brevo has verified, or deliverability suffers. */
  address: 'orders@unlimited-sw.com',
} as const;

export const BRAND = {
  name: 'UNLIMITED',
  siteUrl: 'https://unlimited-sw.com',
  shopUrl: 'https://unlimited-sw.com/shop',
  contactUrl: 'https://unlimited-sw.com/contact',
  adminUrl: 'https://unlimited-sw.com/admin',
  supportEmail: 'orders@unlimited-sw.com',
} as const;

export const CURRENCY = 'L.E';

/** Rendered in the footer — computed, never a stale hardcoded year. */
export function currentYear(): number {
  return new Date().getFullYear();
}
