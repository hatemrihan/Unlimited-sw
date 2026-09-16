/**
 * @jest-environment jsdom
 *
 * Purchase idempotency on the thank-you page.
 *
 * The checkout stores a small, PII-free payload in sessionStorage.
 * `consumeMetaPurchase` fires once per order ID and marks it sent so a page
 * refresh or React re-mount never produces a duplicate.
 */
import {
  consumeMetaPurchase,
  META_PURCHASE_STORAGE_KEY,
} from '../analytics/client/metaPixel';

const fbq = jest.fn();

beforeEach(() => {
  fbq.mockReset();
  sessionStorage.clear();
  Object.defineProperty(window, 'fbq', {
    configurable: true,
    value: fbq,
  });
});

afterEach(() => {
  delete (window as Window & { fbq?: unknown }).fbq;
});

const PURCHASE_PAYLOAD = {
  orderId: 'USW-2001',
  value: 3200,
  items: [
    { id: 'bar-01', quantity: 1, itemPrice: 1650 },
    { id: 'ring-02', quantity: 2, itemPrice: 775 },
  ],
};

describe('thank-you page Purchase event', () => {
  it('fires exactly one Purchase for a confirmed order', () => {
    sessionStorage.setItem(
      META_PURCHASE_STORAGE_KEY,
      JSON.stringify(PURCHASE_PAYLOAD),
    );

    consumeMetaPurchase();

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith(
      'track',
      'Purchase',
      expect.objectContaining({
        content_ids: ['bar-01', 'ring-02'],
        value: 3200,
        currency: 'EGP',
      }),
      { eventID: 'purchase:USW-2001' },
    );
  });

  it('does not fire again on page refresh (second mount)', () => {
    sessionStorage.setItem(
      META_PURCHASE_STORAGE_KEY,
      JSON.stringify(PURCHASE_PAYLOAD),
    );

    consumeMetaPurchase();  // first mount
    consumeMetaPurchase();  // simulated re-mount / refresh

    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it('fires for a different order after a new checkout', () => {
    sessionStorage.setItem(
      META_PURCHASE_STORAGE_KEY,
      JSON.stringify(PURCHASE_PAYLOAD),
    );
    consumeMetaPurchase();

    // New order
    sessionStorage.setItem(
      META_PURCHASE_STORAGE_KEY,
      JSON.stringify({ ...PURCHASE_PAYLOAD, orderId: 'USW-2002', value: 500 }),
    );
    consumeMetaPurchase();

    expect(fbq).toHaveBeenCalledTimes(2);
  });

  it('cleans up the hand-off data after firing', () => {
    sessionStorage.setItem(
      META_PURCHASE_STORAGE_KEY,
      JSON.stringify(PURCHASE_PAYLOAD),
    );

    consumeMetaPurchase();

    expect(sessionStorage.getItem(META_PURCHASE_STORAGE_KEY)).toBeNull();
  });

  it('does nothing when no purchase data exists', () => {
    consumeMetaPurchase();

    expect(fbq).not.toHaveBeenCalled();
  });

  it('drops extra fields that are not part of the commerce contract', () => {
    sessionStorage.setItem(
      META_PURCHASE_STORAGE_KEY,
      JSON.stringify({
        ...PURCHASE_PAYLOAD,
        customer: { email: 'customer@test.com', phone: '+201000000000' },
      }),
    );

    consumeMetaPurchase();

    const params = fbq.mock.calls[0][2];
    expect(params).not.toHaveProperty('customer');
    expect(JSON.stringify(params)).not.toContain('customer@test.com');
    expect(JSON.stringify(params)).not.toContain('+201000000000');
  });
});
