/**
 * @jest-environment node
 *
 * The InstaPay address, InstaPay link and WhatsApp number now come from the
 * coaching platform's /settings (payments/contact.ts) instead of being typed
 * into checkout and the WhatsApp button (7 Oct 2026).
 *
 * The one promise this file must keep: CHECKOUT NEVER BREAKS. Whatever the
 * platform answers — good values, wrong shapes, nothing, or no answer at all —
 * a customer sees a working address, link and button.
 */

const rpc = jest.fn();

jest.mock('../coaches/supabase', () => ({
  __esModule: true,
  coachDatabase: () => ({ rpc }),
}));

// The Data Cache needs a Next request scope that does not exist in a test;
// pass the read straight through so every call reaches the mocked door.
jest.mock('next/cache', () => ({
  __esModule: true,
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { getStoreContact, FALLBACK_CONTACT } from '../payments/contact';
import { displayPhone, toStoreContact } from '../payments/contact-values';

const GOOD = {
  instapay_address: 'new.account@instapay',
  instapay_link: 'https://ipn.eg/S/new.account/instapay/AbC123',
  support_whatsapp: '+966501234567',
};

beforeEach(() => rpc.mockReset());

describe('reading the contact details from /settings', () => {
  it('uses what the head coach saved on /settings', async () => {
    rpc.mockResolvedValue({ data: GOOD, error: null });
    await expect(getStoreContact()).resolves.toEqual({
      instapayAddress: 'new.account@instapay',
      instapayLink: 'https://ipn.eg/S/new.account/instapay/AbC123',
      whatsapp: '+966501234567',
    });
    expect(rpc).toHaveBeenCalledWith('get_store_contact_v1');
  });

  it('falls back to the live values when the platform cannot be reached', async () => {
    rpc.mockRejectedValue(new Error('fetch failed'));
    await expect(getStoreContact()).resolves.toEqual(FALLBACK_CONTACT);
  });

  it('falls back when the door answers with an error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    await expect(getStoreContact()).resolves.toEqual(FALLBACK_CONTACT);
  });

  it('falls back when the door answers with nothing', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(getStoreContact()).resolves.toEqual(FALLBACK_CONTACT);
  });
});

describe('a value of the wrong shape never reaches a customer', () => {
  it('replaces only the bad value and keeps the good ones', () => {
    expect(toStoreContact({ ...GOOD, instapay_address: 'not-an-address' })).toEqual({
      instapayAddress: FALLBACK_CONTACT.instapayAddress,
      instapayLink: GOOD.instapay_link,
      whatsapp: GOOD.support_whatsapp,
    });
  });

  it('refuses a payment link that is not InstaPay’s own', () => {
    for (const link of ['https://ipn.eg.evil.com/S/x', 'http://ipn.eg/S/x', 'https://bit.ly/x', 'javascript:alert(1)']) {
      expect(toStoreContact({ ...GOOD, instapay_link: link }).instapayLink).toBe(FALLBACK_CONTACT.instapayLink);
    }
  });

  it('refuses a WhatsApp number that is not international', () => {
    for (const phone of ['01044878774', '+0501234567', 'call us', '']) {
      expect(toStoreContact({ ...GOOD, support_whatsapp: phone }).whatsapp).toBe(FALLBACK_CONTACT.whatsapp);
    }
  });

  it('treats empty settings as "not set", not as a blank on the page', () => {
    expect(toStoreContact({ instapay_address: '', instapay_link: '', support_whatsapp: '' })).toEqual(
      FALLBACK_CONTACT
    );
  });
});

describe('printing a phone number for people (the refund policy)', () => {
  it('shows an Egyptian mobile the way people dial it', () => {
    expect(displayPhone('+201044878774')).toBe('0104 487 8774');
  });

  it('leaves any other country in international form', () => {
    expect(displayPhone('+966501234567')).toBe('+966501234567');
  });
});

describe('the fallback itself', () => {
  it('is what was live on 7 Oct 2026, and passes its own checks', () => {
    expect(FALLBACK_CONTACT).toEqual({
      instapayAddress: 'muhamed.alkady@instapay',
      instapayLink: 'https://ipn.eg/S/muhamed.alkady/instapay/8kB0I3',
      whatsapp: '+201044878774',
    });
    expect(
      toStoreContact({
        instapay_address: FALLBACK_CONTACT.instapayAddress,
        instapay_link: FALLBACK_CONTACT.instapayLink,
        support_whatsapp: FALLBACK_CONTACT.whatsapp,
      })
    ).toEqual(FALLBACK_CONTACT);
  });
});
