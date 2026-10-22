/**
 * @jest-environment jsdom
 *
 * How many requests the cart page makes, and when.
 *
 * The old page fetched `/api/products/[id]` once per product, and its effect
 * was keyed on a string containing every line's QUANTITY — so every tap of +
 * or − re-fetched the prices and stock of everything in the cart. Five products
 * and five taps was twenty-five round trips to a serverless function for data
 * that had not changed. On top of that it held a full-page spinner until they
 * all came back, so the customer looked at a blank screen instead of at the
 * items they had chosen.
 *
 * These tests pin the two numbers that matter: two requests for a cart visit
 * regardless of how many products it holds — one batch read of those products
 * from CartContext, one uncached stock read from the page — and none at all
 * for a quantity change.
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider, CartItem } from '../contexts/CartContext';
import CartPage from '../app/(en)/cart/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// The nav bar pulls in the session, framer-motion and global listeners; none of
// it is what this test is about.
jest.mock('../app/sections/Nav', () => ({
  __esModule: true,
  default: () => <nav data-testid="nav" />,
}));

const IDS = [
  '507f1f77bcf86cd799439011',
  '507f1f77bcf86cd799439012',
  '507f1f77bcf86cd799439013',
];

function storedCart(count: number): Partial<CartItem>[] {
  return IDS.slice(0, count).map((id, index) => ({
    id,
    name: `Product ${index + 1}`,
    image: '/a.jpg',
    price: 100,
    quantity: 2,
    stock: 10,
  }));
}

/** Answers both endpoints and records every URL asked for. */
function mockFetch(count: number) {
  const calls: string[] = [];

  global.fetch = jest.fn(async (url: unknown) => {
    const href = String(url);
    calls.push(href);

    if (href.startsWith('/api/products/stock')) {
      const stock = Object.fromEntries(
        IDS.slice(0, count).map(id => [id, { productId: id, stock: 10, variants: [], isActive: true }])
      );
      return { ok: true, status: 200, json: async () => ({ success: true, stock }) };
    }

    const products = IDS.slice(0, count).map((id, index) => ({
      _id: id,
      name: `Product ${index + 1}`,
      price: 100,
      mainImage: '/a.jpg',
      variants: [],
    }));
    return { ok: true, status: 200, json: async () => ({ success: true, products }) };
  }) as unknown as typeof fetch;

  return calls;
}

/** Every product-data call a cart visit makes, from the context and the page. */
function cartPageCalls(calls: string[]) {
  return calls.filter(url => url.startsWith('/api/products/stock') || url === '/api/products/batch');
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderCart(count: number) {
  localStorage.setItem('cart', JSON.stringify(storedCart(count)));
  const calls = mockFetch(count);

  render(
    <CartProvider>
      <CartPage />
    </CartProvider>
  );

  await waitFor(() => expect(cartPageCalls(calls).length).toBeGreaterThan(0));
  return calls;
}

describe('the availability check', () => {
  it('makes exactly two requests for one product', async () => {
    const calls = await renderCart(1);

    await waitFor(() => expect(cartPageCalls(calls)).toHaveLength(2));
  });

  it('still makes exactly two requests for three products', async () => {
    // The old page made one per product, and this is the whole point: the
    // number of requests does not grow with the size of the cart. One batch
    // read, one stock read, however many lines.
    const calls = await renderCart(3);

    await waitFor(() => expect(cartPageCalls(calls)).toHaveLength(2));
    expect(cartPageCalls(calls).filter(url => url === '/api/products/batch')).toHaveLength(1);
    expect(cartPageCalls(calls).filter(url => url.startsWith('/api/products/stock'))).toHaveLength(1);
  });

  it('reads stock from the uncached endpoint, not from the cached product read', async () => {
    // /api/products/[id] is cached for 30 seconds; stock must never be.
    const calls = await renderCart(2);

    await waitFor(() => expect(cartPageCalls(calls)).toHaveLength(2));
    expect(calls.some(url => /^\/api\/products\/[0-9a-f]{24}/.test(url))).toBe(false);
  });

  it('makes no further requests when a quantity changes', async () => {
    const calls = await renderCart(2);
    await waitFor(() => expect(cartPageCalls(calls)).toHaveLength(2));

    const before = cartPageCalls(calls).length;
    const increase = await screen.findAllByLabelText(/increase quantity/i);

    await act(async () => {
      await userEvent.click(increase[0]);
      await userEvent.click(increase[0]);
    });

    expect(cartPageCalls(calls)).toHaveLength(before);
  });
});

describe('what the customer sees while it runs', () => {
  it('shows the cart items immediately, without waiting for the check', async () => {
    localStorage.setItem('cart', JSON.stringify(storedCart(2)));

    // A request that never resolves — the page must still render the cart.
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    render(
      <CartProvider>
        <CartPage />
      </CartProvider>
    );

    expect(await screen.findByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
  });

  it('holds the checkout button until availability is confirmed', async () => {
    localStorage.setItem('cart', JSON.stringify(storedCart(1)));
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    render(
      <CartProvider>
        <CartPage />
      </CartProvider>
    );

    const checkout = await screen.findByRole('button', { name: /checking availability/i });
    expect(checkout).toBeDisabled();
  });
});
