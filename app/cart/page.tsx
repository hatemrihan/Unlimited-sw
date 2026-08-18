"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../sections/Nav';
import { useCart, CartItem } from '../../contexts/CartContext';

/**
 * Cart Page — MongoDB-only, production-hardened
 *
 * Data Flow:
 *   1. CartContext loads items from localStorage on mount (with legacy ID migration)
 *   2. This page performs a SECOND validation pass against live MongoDB data
 *   3. Any price/stock drift is auto-corrected and synced back to localStorage
 *   4. Legacy static IDs (non-ObjectId format) are migrated by name match or purged
 *
 * Anti-patterns eliminated:
 *   - No static product imports
 *   - No global CityPricing references
 *   - No infinite re-render loops (guarded by cartIdentityRef)
 *   - No stale closure over cart items (uses ref for identity tracking)
 */

// ── Constants ────────────────────────────────────────────────────────────────
const PRODUCTS_API_TIMEOUT = 8000; // 8s timeout for product fetches

// ── Helpers ──────────────────────────────────────────────────────────────────
function priceKey(itemId: string, variantName?: string): string {
  return `${itemId}_${variantName || 'default'}`;
}

/** Fetch with timeout — prevents hanging requests from blocking the cart */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Live stock for the lines this cart holds.
 *
 * The only request this page makes, and it is the one that cannot be avoided.
 *
 * It used to fetch `/api/products/[id]` once PER PRODUCT as well, re-fired on
 * every tap of + or − because the effect's key included quantities — five
 * products and five taps was twenty-five round trips for data that had not
 * changed. Prices and images now come from CartContext, which has already
 * re-read exactly these products from the batch endpoint; fetching them again
 * here was the same query twice on one page load.
 *
 * Stock is separate on purpose and always will be: `/api/products/[id]` is
 * cached for 30 seconds, and this endpoint exists precisely because stock is
 * the one number that must never be served from a cache.
 */
async function fetchCartStock(ids: string[]): Promise<Record<string, any> | null> {
  try {
    const response = await fetchWithTimeout(
      `/api/products/stock?ids=${ids.join(',')}`,
      { method: 'GET' },
      PRODUCTS_API_TIMEOUT
    );
    if (!response.ok) return null;

    const data = await response.json();
    return data.success && data.stock ? data.stock : null;
  } catch {
    return null;
  }
}

// ── Component ────────────────────────────────────────────────────────────────
const CartPage = () => {
  const router = useRouter();
  const { state: cartState, updateQuantity, removeItem, syncItems } = useCart();
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshedPrices, setRefreshedPrices] = useState<Record<string, number>>({});

  /**
   * Which products are in the cart — not how many of each.
   *
   * This is the whole performance fix. The old identity string included every
   * line's quantity, so pressing + re-ran the entire availability check: the
   * prices and stock of the same products, fetched again, because the customer
   * wanted two of something instead of one.
   */
  const productIdsKey = useMemo(
    () => [...new Set(cartState.items.map(item => item.id))].sort().join(','),
    [cartState.items]
  );

  /** The live cart, for the availability check to read when it finishes. */
  const itemsRef = useRef(cartState.items);
  itemsRef.current = cartState.items;

  // ── Core: Refresh prices & validate stock against live MongoDB ─────────
  useEffect(() => {
    if (!productIdsKey) {
      setCheckingAvailability(false);
      return;
    }

    // A check already in flight when the cart changes underneath it must not
    // write its stale answer over the new one.
    let abandoned = false;

    const refreshCart = async () => {
      setCheckingAvailability(true);

      try {
        setRefreshError(null);
        const uniqueIds = productIdsKey.split(',');

        // One request, whatever the cart holds.
        const stockById = await fetchCartStock(uniqueIds);

        if (abandoned) return;

        // Could not reach it. We do not know what is available, and guessing is
        // what let sold-out items through to checkout.
        if (stockById === null) {
          setRefreshError('We could not confirm availability for some items. Refresh the page before you check out.');
          return;
        }

        // ── Validate every cart item ────────────────────────────────────────
        const prices: Record<string, number> = {};
        let needsSync = false;

        // Read through a ref, not the closure. This effect deliberately does
        // not re-run when quantities change, so the `cartState.items` captured
        // when it started can be a tap or two out of date by the time the
        // requests come back — and writing that back would undo the customer's
        // last press.
        const currentItems = itemsRef.current;

        const validated = currentItems.map(item => {
          const availability = stockById[item.id];

          // The stock endpoint reports on every product it can find, so no
          // entry means no such product — deleted, or an id predating MongoDB.
          // The name-matching migration that used to sit here has been removed
          // on purpose: it was the third of four copies of one idea, and only
          // the server's copy is one a customer cannot bypass.
          if (!availability) {
            needsSync = true;
            return { ...item, quantity: 0 }; // Filtered out below
          }

          // Price already comes from CartContext, which re-read exactly these
          // products from the batch endpoint on load. Stock comes from here,
          // uncached, because a cached stock number is how a sold-out item
          // keeps being offered for another 30 seconds.
          const livePrice = item.price;

          // Unknown stock is treated as none. Inventing a ceiling here is what
          // let sold-out items reach the checkout form.
          let liveStock = typeof availability.stock === 'number' ? availability.stock : 0;

          // A product taken off sale is unavailable however much of it is in
          // the warehouse.
          if (availability.isActive === false) {
            liveStock = 0;
          }

          if (item.variant) {
            const variantStock = availability.variants?.find(
              (v: any) => v.name === item.variant?.name
            );
            if (typeof variantStock?.stock === 'number') {
              liveStock = availability.isActive === false ? 0 : variantStock.stock;
            }
          }

          prices[priceKey(item.id, item.variant?.name)] = livePrice;

          // ── Auto-correct quantity against live stock ────────────────────
          let qty = item.quantity;
          if (qty > liveStock) {
            qty = liveStock;
            needsSync = true;
          }

          // ── Detect any metadata drift ──────────────────────────────────
          if (item.stock !== liveStock || item.price !== livePrice) {
            needsSync = true;
          }

          return {
            ...item,
            quantity: qty,
            stock: liveStock,
            price: livePrice,
          };
        }).filter(item => item.quantity > 0);

        // Check if items were removed
        if (validated.length !== currentItems.length) {
          needsSync = true;
        }

        setRefreshedPrices(prices);

        // Sync corrected items back to CartContext → localStorage
        if (needsSync && typeof syncItems === 'function') {
          syncItems(validated);
        }
      } catch (error) {
        console.error('[Cart] Refresh failed:', error);
        setRefreshError('Could not refresh your cart. Please try again.');
      } finally {
        if (!abandoned) setCheckingAvailability(false);
      }
    };

    refreshCart();

    return () => {
      abandoned = true;
    };
    // Deliberately keyed on the SET of products, not on `cartState.items` —
    // changing a quantity must not re-fetch anything. `syncItems` is memoised
    // in CartContext, so it is stable and safe to depend on.
  }, [productIdsKey, syncItems]);

  // ── Computed: subtotal using refreshed prices ──────────────────────────────
  const subtotal = useMemo(() => {
    return cartState.items.reduce((sum, item) => {
      const price = refreshedPrices[priceKey(item.id, item.variant?.name)] ?? item.price;
      return sum + price * item.quantity;
    }, 0);
  }, [cartState.items, refreshedPrices]);

  // ── Helper: get display price for a single item line ───────────────────────
  const getItemPrice = useCallback((item: CartItem): number => {
    return refreshedPrices[priceKey(item.id, item.variant?.name)] ?? item.price;
  }, [refreshedPrices]);

  const getItemTotal = useCallback((item: CartItem): string => {
    return (getItemPrice(item) * item.quantity).toLocaleString();
  }, [getItemPrice]);

  // ── Quantity update with stock guard ────────────────────────────────────────
  const handleUpdateQuantity = useCallback((
    itemId: string,
    variant: CartItem['variant'],
    newQuantity: number
  ) => {
    const item = cartState.items.find(i =>
      i.id === itemId && i.variant?.name === variant?.name
    );
    if (!item) return;

    if (newQuantity <= 0) {
      removeItem(item.id, item.variant);
      return;
    }

    // Unknown stock caps at the current quantity rather than an invented
    // ceiling — the server is the authority, the UI must not guess upward.
    const maxStock = item.stock ?? item.quantity;
    updateQuantity(item.id, item.variant, Math.min(newQuantity, maxStock), item.stock);
  }, [cartState.items, removeItem, updateQuantity]);

  // ── Item count for header ──────────────────────────────────────────────────
  const totalItemCount = useMemo(() => {
    return cartState.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartState.items]);

  // The cart itself comes from localStorage and is already known, so there is
  // nothing to wait for before showing it. This used to be a full-page spinner
  // held until every product request came back: the customer stared at a blank
  // screen rather than at the items they had chosen, and on a slow connection
  // that was seconds of looking at nothing. The check now runs behind the
  // items, and only the checkout button waits for it.

  return (
    <div className="min-h-screen bg-stone-900 text-white">
      <Nav />

      <div className="pt-20 lg:pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="text-[#b3b3b3] px-4 hover:text-gray-300 transition-colors duration-300 mb-12 flex items-center text-xs"
              aria-label="Continue Shopping"
            >
              ← Continue Shopping
            </button>

            <h1 className="text-xl px-4 sm:text-xl md:text-2xl lg:text-3xl font-bold uppercase tracking-wider text-[#b3b3b3]">
              CART {totalItemCount > 0 && <span className="text-sm font-normal">({totalItemCount})</span>}
            </h1>
          </div>

          {/* Refresh Error Banner */}
          {refreshError && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded text-red-300 text-sm">
              {refreshError}
            </div>
          )}

          {cartState.items.length === 0 ? (
            /* Empty Cart */
            <div className="text-center py-16 lg:py-24">
              <h2 className="text-2xl lg:text-3xl font-medium text-[#b3b3b3] mb-4">Your cart is empty</h2>
              <p className="text-[#b3b3b3] mb-8">Add some calisthenics equipment to get started!</p>
              <button
                onClick={() => router.push('/shop')}
                className="bg-transparent border border-white text-white px-8 py-3 font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors duration-300"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                {cartState.items.map((item) => {
                  const unitPrice = getItemPrice(item);
                  const isOutOfStock = item.stock !== undefined && item.stock <= 0;
                  const isLowStock = item.stock !== undefined && item.stock > 0 && item.stock <= 3;

                  return (
                    <div
                      key={`${item.id}-${item.variant?.name || 'default'}`}
                      className={`bg-stone-900/50 p-4 mb-4 transition-opacity duration-300 ${isOutOfStock ? 'opacity-50' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                        {/* Image + Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div
                            className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity duration-300"
                            onClick={() => router.push(`/product/${item.id}`)}
                            role="link"
                            aria-label={`View ${item.name}`}
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-[#b3b3b3] font-medium text-sm sm:text-base mb-1 leading-tight truncate">
                              {item.name}
                            </h3>
                            {item.variant && (
                              <p className="text-[#b3b3b3]/60 text-xs sm:text-sm mb-1">{item.variant.name}</p>
                            )}
                            {/* Unit price */}
                            <p className="text-[#b3b3b3]/40 text-xs">
                              {unitPrice.toLocaleString()} L.E each
                            </p>
                            {/* Stock warnings */}
                            {isOutOfStock && (
                              <p className="text-red-400 text-xs mt-1 font-medium">Out of stock</p>
                            )}
                            {isLowStock && (
                              <p className="text-amber-400 text-xs mt-1">Only {item.stock} left</p>
                            )}
                            {/* Mobile total */}
                            <p className="text-[#b3b3b3] font-bold text-sm sm:hidden mt-2">
                              {getItemTotal(item)} L.E
                            </p>
                          </div>
                        </div>

                        {/* Quantity + Price + Remove */}
                        <div className="flex items-center justify-between sm:justify-end sm:gap-6">
                          {/* Quantity controls */}
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleUpdateQuantity(item.id, item.variant, item.quantity - 1);
                              }}
                              disabled={item.quantity <= 1}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className={`w-8 h-8 border border-white flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                item.quantity <= 1
                                  ? 'text-white/30 cursor-not-allowed bg-transparent border-white/30'
                                  : 'text-white hover:bg-white hover:text-black bg-transparent'
                              }`}
                            >
                              −
                            </button>
                            <span className="text-[#b3b3b3] font-bold w-8 text-center text-sm tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleUpdateQuantity(item.id, item.variant, item.quantity + 1);
                              }}
                              disabled={item.stock !== undefined && item.quantity >= item.stock}
                              aria-label={`Increase quantity of ${item.name}`}
                              className={`w-8 h-8 border border-white flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                item.stock !== undefined && item.quantity >= item.stock
                                  ? 'text-white/30 cursor-not-allowed bg-transparent border-white/30'
                                  : 'text-white hover:bg-white hover:text-black bg-transparent'
                              }`}
                            >
                              +
                            </button>
                          </div>

                          {/* Desktop price */}
                          <div className="hidden sm:block text-right min-w-[80px]">
                            <div className="text-[#b3b3b3] font-bold text-base tabular-nums">
                              {getItemTotal(item)} L.E
                            </div>
                          </div>

                          {/* Remove */}
                          <button
                            onClick={() => removeItem(item.id, item.variant)}
                            aria-label={`Remove ${item.name} from cart`}
                            className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors duration-300 ml-2"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-stone-900/50 text-white p-6 lg:p-8 sticky top-24">
                  <h2 className="text-lg lg:text-xl font-bold mb-6 uppercase tracking-wider">
                    ORDER SUMMARY
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#b3b3b3]">Subtotal ({totalItemCount} items)</span>
                      <span className="font-medium tabular-nums">L.E {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#b3b3b3]">Shipping</span>
                      <span className="font-medium text-[#b3b3b3]/60">Calculated at checkout</span>
                    </div>
                    <div className="border-t border-white/20 pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="tabular-nums">L.E {subtotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Blocked while availability is unconfirmed — sending an
                      unvalidated cart to checkout is what produced the
                      "sold out" failures at the final step. */}
                  <button
                    onClick={() => router.push('/checkout')}
                    disabled={!!refreshError || checkingAvailability}
                    className="w-full bg-transparent border border-white text-white py-4 font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white"
                  >
                    {checkingAvailability ? 'CHECKING AVAILABILITY…' : 'PROCEED TO CHECKOUT'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage;
