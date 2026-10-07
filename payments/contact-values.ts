/**
 * The SHAPE of the store's contact details, and the values to fall back on.
 *
 * Plain values and checks only — nothing here talks to a database — so the
 * checkout page (which runs in the customer's browser) can import it without
 * pulling the server code in with it. The reading lives in contact.ts.
 */

export interface StoreContact {
  /** name@instapay */
  instapayAddress: string;
  /** https://ipn.eg/… */
  instapayLink: string;
  /** International form, digits only after the +: +201044878774 */
  whatsapp: string;
}

/**
 * What was live on 7 Oct 2026. Shown only when the coaching platform cannot
 * answer. If the InstaPay account ever changes for good, change it here too.
 */
export const FALLBACK_CONTACT: StoreContact = {
  instapayAddress: 'muhamed.alkady@instapay',
  instapayLink: 'https://ipn.eg/S/muhamed.alkady/instapay/8kB0I3',
  whatsapp: '+201044878774',
};

// The same shapes /settings enforces before saving (unlimited-admin
// settings/schema.ts). Checked again here because this is the side that puts
// them in front of customers: a value changed straight in the database, past
// the dashboard, must still never reach a checkout page broken.
const ADDRESS = /^[a-z0-9][a-z0-9._-]{1,60}@instapay$/i;
const WHATSAPP = /^\+[1-9]\d{8,14}$/;

function isInstapayLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'ipn.eg';
  } catch {
    return false;
  }
}

/**
 * A phone number the way a reader expects to see it printed: an Egyptian
 * mobile in the local form people dial (+201044878774 → 0104 487 8774),
 * anything else in its international form. Links always use the raw
 * international value; this is for text only.
 */
export function displayPhone(international: string): string {
  const egypt = /^\+20(1\d)(\d)(\d{3})(\d{4})$/.exec(international);
  if (egypt) return `0${egypt[1]}${egypt[2]} ${egypt[3]} ${egypt[4]}`;
  return international;
}

/** Keep each good value; replace each missing or malformed one with its fallback. */
export function toStoreContact(raw: unknown): StoreContact {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const text = (key: string) => (typeof row[key] === 'string' ? (row[key] as string).trim() : '');

  const address = text('instapay_address');
  const link = text('instapay_link');
  const whatsapp = text('support_whatsapp');

  return {
    instapayAddress: ADDRESS.test(address) ? address : FALLBACK_CONTACT.instapayAddress,
    instapayLink: isInstapayLink(link) ? link : FALLBACK_CONTACT.instapayLink,
    whatsapp: WHATSAPP.test(whatsapp) ? whatsapp : FALLBACK_CONTACT.whatsapp,
  };
}
