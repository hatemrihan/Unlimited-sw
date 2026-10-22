/**
 * @jest-environment jsdom
 *
 * Applying a promo code at checkout.
 *
 * Three faults lived here at once, and the first hid the other two:
 *
 * 1. The hook posted `{ code }` alone. `/api/promo/validate` refuses a body
 *    with no `orderTotal` (400), so EVERY code a customer typed came back
 *    "Invalid promo code" — no code could be applied at all.
 *
 * 2. The failure branch read `data.message`; the route returns `data.error`.
 *    So even when the server explained itself ("Minimum order of L.E 2000
 *    required") the customer saw the generic message instead.
 *
 * 3. The discount was recomputed on the client as `subtotal * value / 100`,
 *    ignoring `maximumDiscount` — which the server DOES apply. A capped code
 *    therefore priced differently on the two sides, and the order was refused
 *    at submit with a 409 PRICING_MISMATCH, after the customer had filled in
 *    the entire form.
 *
 * The rule these tests hold: the server decides what a code takes off; the
 * client only displays it.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCheckoutPricing } from '../app/(en)/checkout/hooks/useCheckoutPricing';
import type { CartItem } from '../contexts/CartContext';

const cartItems: CartItem[] = [
  { id: '507f1f77bcf86cd799439011', name: 'Tee', image: '/t.jpg', price: 500, quantity: 2 }
];
// subtotal = 500 × 2 = 1000

interface RecordedCall {
  url: string;
  body: Record<string, unknown> | undefined;
}

/**
 * Stands in for both endpoints the hook calls.
 *
 * `/api/checkout/cities` always answers with no governorates, so shipping and
 * COD stay at 0 and the totals below are the discount arithmetic alone.
 */
function mockFetch(promo: { status: number; body: unknown }): RecordedCall[] {
  const calls: RecordedCall[] = [];

  global.fetch = jest.fn(async (url: unknown, init?: { body?: string }) => {
    const href = String(url);
    calls.push({ url: href, body: init?.body ? JSON.parse(init.body) : undefined });

    if (href.startsWith('/api/checkout/cities')) {
      return { ok: true, status: 200, json: async () => ({ cities: [] }) };
    }
    return {
      ok: promo.status < 400,
      status: promo.status,
      json: async () => promo.body
    };
  }) as unknown as typeof fetch;

  return calls;
}

function renderPricing() {
  return renderHook(() =>
    useCheckoutPricing({ cartItems, paymentMethod: 'cashOnDelivery', cityName: '' })
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('applying a promo code', () => {
  it('sends the order total, so the endpoint does not refuse the request outright', async () => {
    const calls = mockFetch({
      status: 200,
      body: {
        success: true,
        promo: {
          code: 'SAVE100',
          discountType: 'fixed',
          discountValue: 100,
          discount: 100,
          waiveShipping: false
        }
      }
    });

    const { result } = renderPricing();
    await act(async () => {
      await result.current.applyPromoCode('SAVE100');
    });

    const promoCall = calls.find(call => call.url === '/api/promo/validate');
    expect(promoCall).toBeDefined();
    expect(promoCall!.body).toEqual({ code: 'SAVE100', orderTotal: 1000 });
  });

  it('shows the discount the server calculated rather than recomputing it', async () => {
    // 20% of 1000 is 200, but this code is capped at 100, so the server sends 100.
    mockFetch({
      status: 200,
      body: {
        success: true,
        promo: {
          code: 'CAPPED20',
          discountType: 'percentage',
          discountValue: 20,
          discount: 100,
          waiveShipping: false
        }
      }
    });

    const { result } = renderPricing();
    await act(async () => {
      await result.current.applyPromoCode('CAPPED20');
    });

    await waitFor(() => expect(result.current.appliedPromo).not.toBeNull());
    expect(result.current.discountAmount).toBe(100);
    expect(result.current.totalWithShipping).toBe(900);
  });

  it('shows the reason the server gave for refusing the code', async () => {
    mockFetch({
      status: 400,
      body: { success: false, error: 'Minimum order of L.E 2000 required' }
    });

    const { result } = renderPricing();
    await act(async () => {
      await result.current.applyPromoCode('BIGSPEND');
    });

    await waitFor(() =>
      expect(result.current.promoError).toBe('Minimum order of L.E 2000 required')
    );
    expect(result.current.appliedPromo).toBeNull();
  });
});
