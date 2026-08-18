/**
 * @jest-environment jsdom
 *
 * What the cart tells its callers, and what it asks the server for.
 *
 * Two separate faults live here.
 *
 * The first is silence. The reducer refuses an add that would exceed stock by
 * returning the state untouched — right, but `addItem` returned void, so the
 * button could not tell "added" from "ignored". The customer pressed a button
 * that did nothing and had no idea why.
 *
 * The second is cost. Loading the cart fetched `/api/products?limit=200` — the
 * whole catalogue — on every page load, for every visitor with anything in
 * their cart, to re-price a handful of lines. Worse, the API silently caps that
 * limit at 100, so a shop with more products would have quietly dropped the
 * rest and emptied carts holding them.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { CartProvider, useCart, CartItem } from '../contexts/CartContext';

const PRODUCT_A = '507f1f77bcf86cd799439011';
const PRODUCT_B = '507f1f77bcf86cd799439012';

function product(id: string, price: number, overrides: Record<string, unknown> = {}) {
  return { _id: id, name: `Product ${id.slice(-1)}`, price, variants: [], ...overrides };
}

/** Records every request the cart makes, and answers the batch endpoint. */
function mockFetch(products: unknown[] | null) {
  const calls: string[] = [];

  global.fetch = jest.fn(async (url: unknown) => {
    calls.push(String(url));

    if (products === null) {
      return { ok: false, status: 503, json: async () => ({ success: false }) };
    }
    return { ok: true, status: 200, json: async () => ({ success: true, products }) };
  }) as unknown as typeof fetch;

  return calls;
}

function seedStoredCart(items: Partial<CartItem>[]) {
  localStorage.setItem('cart', JSON.stringify(items));
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('loading a stored cart', () => {
  it('asks only for the products in the cart, not for the whole catalogue', async () => {
    seedStoredCart([
      { id: PRODUCT_A, name: 'Product 1', image: '/a.jpg', price: 100, quantity: 1 },
    ]);
    const calls = mockFetch([product(PRODUCT_A, 120)]);

    renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls).toEqual(['/api/products/batch']);
    expect(calls.some(url => url.includes('limit=200'))).toBe(false);
  });

  it('takes the live price over the stored one', async () => {
    seedStoredCart([
      { id: PRODUCT_A, name: 'Product 1', image: '/a.jpg', price: 100, quantity: 2 },
    ]);
    mockFetch([product(PRODUCT_A, 120)]);

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.state.items[0]?.price).toBe(120));
    expect(result.current.state.total).toBe(240);
  });

  it('drops a line whose product no longer exists', async () => {
    seedStoredCart([
      { id: PRODUCT_A, name: 'Product 1', image: '/a.jpg', price: 100, quantity: 1 },
      { id: PRODUCT_B, name: 'Product 2', image: '/b.jpg', price: 50, quantity: 1 },
    ]);
    mockFetch([product(PRODUCT_A, 100)]); // B was deleted

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.state.items).toHaveLength(1));
    expect(result.current.state.items[0].id).toBe(PRODUCT_A);
  });

  it('keeps the cart as stored when the API cannot be reached', async () => {
    // "We could not check" must never be treated as "these products are gone".
    seedStoredCart([
      { id: PRODUCT_A, name: 'Product 1', image: '/a.jpg', price: 100, quantity: 1 },
    ]);
    mockFetch(null);

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.state.items).toHaveLength(1));
    expect(result.current.state.items[0].price).toBe(100);
  });
});

describe('addItem', () => {
  const item = {
    id: PRODUCT_A,
    name: 'Product 1',
    image: '/a.jpg',
    price: 100,
  };

  it('reports the add it made', async () => {
    mockFetch([]);
    const { result } = renderHook(() => useCart(), { wrapper });

    let outcome: { added: boolean; remaining: number } | undefined;
    act(() => {
      outcome = result.current.addItem({ ...item, stock: 5 }, 2);
    });

    expect(outcome).toEqual({ added: true, remaining: 3 });
    expect(result.current.state.itemCount).toBe(2);
  });

  it('reports the add it refused, and how many are left', async () => {
    mockFetch([]);
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ ...item, stock: 3 }, 2);
    });

    let outcome: { added: boolean; remaining: number } | undefined;
    act(() => {
      // Two are already in the cart and only three exist, so this cannot go in.
      outcome = result.current.addItem({ ...item, stock: 3 }, 2);
    });

    expect(outcome).toEqual({ added: false, remaining: 1 });
    // And the refusal really did leave the cart alone.
    expect(result.current.state.itemCount).toBe(2);
  });

  it('says nothing is left when the cart already holds the whole stock', async () => {
    mockFetch([]);
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ ...item, stock: 2 }, 2);
    });

    let outcome: { added: boolean; remaining: number } | undefined;
    act(() => {
      outcome = result.current.addItem({ ...item, stock: 2 }, 1);
    });

    expect(outcome).toEqual({ added: false, remaining: 0 });
  });

  it('counts variants separately, so one colour does not exhaust another', async () => {
    mockFetch([]);
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ ...item, stock: 2, variant: { name: 'Red' } }, 2);
    });

    let outcome: { added: boolean; remaining: number } | undefined;
    act(() => {
      outcome = result.current.addItem({ ...item, stock: 2, variant: { name: 'Blue' } }, 2);
    });

    expect(outcome?.added).toBe(true);
    expect(result.current.state.itemCount).toBe(4);
  });

  it('allows the add when stock is unknown rather than blocking the sale', async () => {
    mockFetch([]);
    const { result } = renderHook(() => useCart(), { wrapper });

    let outcome: { added: boolean; remaining: number } | undefined;
    act(() => {
      outcome = result.current.addItem(item, 1);
    });

    expect(outcome?.added).toBe(true);
  });
});
