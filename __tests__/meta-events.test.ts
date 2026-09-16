/**
 * @jest-environment jsdom
 *
 * Meta Pixel's browser boundary.
 *
 * These tests catch two costly mistakes: sending the wrong standard event (so
 * Ads Manager cannot optimise for the action), and accidentally expanding a
 * commerce event into customer data. `fbq` is the external boundary, so it is
 * replaced with a spy while the mapper itself remains real.
 */
import {
  trackMetaAddToCart,
  consumeMetaPurchase,
  META_PURCHASE_STORAGE_KEY,
  trackMetaInitiateCheckout,
  trackMetaPageView,
  trackMetaPurchase,
  trackMetaViewContent,
} from '../analytics/client/metaPixel';
import { __resetForTests, track } from '../analytics/client/track';

const fbq = jest.fn();

beforeEach(() => {
  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = 'true';
  __resetForTests();
  sessionStorage.clear();
  fbq.mockReset();
  Object.defineProperty(window, 'fbq', {
    configurable: true,
    value: fbq,
  });
});

afterEach(() => {
  delete (window as Window & { fbq?: unknown }).fbq;
});

describe('Meta standard events', () => {
  it('sends PageView without URL or customer data', () => {
    trackMetaPageView();

    expect(fbq).toHaveBeenCalledWith('track', 'PageView');
  });

  it('sends a product view with Meta commerce parameters', () => {
    trackMetaViewContent({
      productId: 'bar-01',
      productName: 'Wall Bar',
      value: 1650,
    });

    expect(fbq).toHaveBeenCalledWith('track', 'ViewContent', {
      content_ids: ['bar-01'],
      content_name: 'Wall Bar',
      content_type: 'product',
      value: 1650,
      currency: 'EGP',
    });
  });

  it('sends an accepted cart add with its product, quantity, and value only', () => {
    trackMetaAddToCart({
      productId: 'ring-02',
      productName: 'Gym Rings',
      variantName: 'Wood',
      quantity: 2,
      value: 900,
    });

    expect(fbq).toHaveBeenCalledWith('track', 'AddToCart', {
      content_ids: ['ring-02'],
      content_name: 'Gym Rings',
      content_type: 'product',
      content_variant: 'Wood',
      contents: [{ id: 'ring-02', quantity: 2 }],
      value: 900,
      currency: 'EGP',
    });
  });

  it('sends the checkout total and item count', () => {
    trackMetaInitiateCheckout({ itemCount: 3, value: 2550 });

    expect(fbq).toHaveBeenCalledWith('track', 'InitiateCheckout', {
      num_items: 3,
      value: 2550,
      currency: 'EGP',
    });
  });

  it('sends a purchase once with a deterministic event id for later CAPI deduplication', () => {
    trackMetaPurchase({
      orderId: 'USW-1001',
      value: 2550,
      items: [
        { id: 'bar-01', quantity: 1, itemPrice: 1650 },
        { id: 'ring-02', quantity: 2, itemPrice: 450 },
      ],
    });

    expect(fbq).toHaveBeenCalledWith(
      'track',
      'Purchase',
      {
        content_ids: ['bar-01', 'ring-02'],
        content_type: 'product',
        contents: [
          { id: 'bar-01', quantity: 1, item_price: 1650 },
          { id: 'ring-02', quantity: 2, item_price: 450 },
        ],
        value: 2550,
        currency: 'EGP',
      },
      { eventID: 'purchase:USW-1001' },
    );
  });

  it('does not throw when an ad blocker removes Meta Pixel', () => {
    delete (window as Window & { fbq?: unknown }).fbq;

    expect(() => trackMetaPageView()).not.toThrow();
    expect(() => trackMetaPurchase({ orderId: 'USW-1002', value: 1, items: [] })).not.toThrow();
  });

  it('still forwards a checkout event when first-party analytics is switched off', () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = 'false';

    track('InitiateCheckout', { itemCount: 3, value: 2550, currency: 'EGP' });

    expect(fbq).toHaveBeenCalledWith('track', 'InitiateCheckout', {
      num_items: 3,
      value: 2550,
      currency: 'EGP',
    });
  });

  it('consumes a confirmed purchase once and removes its browser hand-off data', () => {
    sessionStorage.setItem(META_PURCHASE_STORAGE_KEY, JSON.stringify({
      orderId: 'USW-1003',
      value: 2550,
      items: [{ id: 'bar-01', quantity: 1, itemPrice: 1650 }],
      customer: { email: 'customer@example.com' },
    }));

    consumeMetaPurchase();
    consumeMetaPurchase();

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith(
      'track',
      'Purchase',
      {
        content_ids: ['bar-01'],
        content_type: 'product',
        contents: [{ id: 'bar-01', quantity: 1, item_price: 1650 }],
        value: 2550,
        currency: 'EGP',
      },
      { eventID: 'purchase:USW-1003' },
    );
    expect(sessionStorage.getItem(META_PURCHASE_STORAGE_KEY)).toBeNull();
  });
});
