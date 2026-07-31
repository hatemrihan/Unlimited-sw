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
const MONGODB_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const PRODUCTS_API_TIMEOUT = 8000; // 8s timeout for product fetches

// ── Helpers ──────────────────────────────────────────────────────────────────
function priceKey(itemId: string, variantName?: string): string {
  return `${itemId}_${variantName || 'default'}`;
}

function isValidMongoId(id: string): boolean {
  return MONGODB_ID_REGEX.test(id);
}

/** Fetch with timeout — prevents hanging requests from blocking the cart */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

// ── Types ────────────────────────────────────────────────────────────────────
interface RefreshedProduct {
  id: string;
  product: any | null;
}

// ── Component ────────────────────────────────────────────────────────────────
const CartPage = () => {
  const router = useRouter();
  const { state: cartState, updateQuantity, removeItem, syncItems } = useCart();
  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshedPrices, setRefreshedPrices] = useState<Record<string, number>>({});

  // Guard against infinite effect loops — only refresh once per cart identity
  const cartIdentityRef = useRef('');

  // ── Core: Refresh prices & validate stock against live MongoDB ─────────
  useEffect(() => {
    // Build stable identity string from current cart contents
    const cartIdentity = cartState.items
      .map(i => `${i.id}:${i.variant?.name || ''}:${i.quantity}`)
      .join('|');

    // Already refreshed this exact cart state — skip
    if (cartIdentity === cartIdentityRef.current) {
      setLoading(false);
      return;
    }

    // Empty cart — nothing to validate
    if (cartState.items.length === 0) {
      setLoading(false);
      cartIdentityRef.current = cartIdentity;
      return;
    }

    const refreshCart = async () => {
      try {
        setRefreshError(null);
        const uniqueIds = [...new Set(cartState.items.map(item => item.id))];
        const validIds = uniqueIds.filter(isValidMongoId);
        const legacyIds = uniqueIds.filter(id => !isValidMongoId(id));

        // ── Step 1: Migrate legacy IDs (users who carted static products) ──
        let allDbProducts: any[] = [];
        if (legacyIds.length > 0) {
          try {
            const res = await fetchWithTimeout('/api/products?limit=200', PRODUCTS_API_TIMEOUT);
            if (res.ok) {
              const data = await res.json();
              if (data.success && Array.isArray(data.products)) {
                allDbProducts = data.products;
              }
            }
          } catch {
            // Migration will fail gracefully — legacy items get purged below
          }
        }

        // ── Step 2: Batch-fetch live product data for valid IDs ─────────────
        const results: RefreshedProduct[] = await Promise.all(
          validIds.map(async (id): Promise<RefreshedProduct> => {
            try {
              const res = await fetchWithTimeout(`/api/products/${id}`, PRODUCTS_API_TIMEOUT);
              if (res.ok) {
                const data = await res.json();
                return { id, product: data.product ?? null };
              }
            } catch {
              // Individual product fetch failed — will be handled below
            }
            return { id, product: null };
          })
        );

        // ── Step 3: Build O(1) product lookup map ──────────────────────────
        const productMap: Record<string, any> = {};
        for (const { id, product } of results) {
          if (product) productMap[id] = product;
        }

        // ── Step 4: Validate every cart item ────────────────────────────────
        const prices: Record<string, number> = {};
        let needsSync = false;
        // Set when any line's availability could not be confirmed against the
        // database. Checkout stays blocked while true.
        let validationFailed = false;

        const validated = cartState.items.map(item => {
          let resolvedId = item.id;

          // ── Legacy ID Migration ──────────────────────────────────────────
          if (!isValidMongoId(resolvedId)) {
            const matchByName = allDbProducts.find(
              (p: any) => p.name?.trim().toLowerCase() === item.name?.trim().toLowerCase()
            );
            if (matchByName?._id) {
              resolvedId = matchByName._id.toString();
              productMap[resolvedId] = matchByName;
              needsSync = true;
            } else {
              // No match found — product doesn't exist in DB, purge it
              needsSync = true;
              return { ...item, quantity: 0 }; // Filtered out below
            }
          }

          const product = productMap[resolvedId];

          // Product fetch failed (network error). We do NOT know this item's
          // stock, and guessing lets an unavailable item through to checkout —
          // block instead.
          if (!product) {
            validationFailed = true;
            return { ...item, id: resolvedId };
          }

          // ── Resolve live price & stock ─────────────────────────────────
          let livePrice = product.price ?? 0;
          // Unknown stock is treated as none. Inventing a ceiling here is what
          // let sold-out items reach the checkout form.
          let liveStock = typeof product.stock === 'number' ? product.stock : 0;

          if (item.variant && Array.isArray(product.variants)) {
            const variantMatch = product.variants.find(
              (v: any) => v.name === item.variant?.name
            );
            if (variantMatch) {
              if (typeof variantMatch.price === 'number' && variantMatch.price > 0) {
                livePrice = variantMatch.price;
              }
              if (typeof variantMatch.stock === 'number') {
                liveStock = variantMatch.stock;
              }
            }
          }

          prices[priceKey(resolvedId, item.variant?.name)] = livePrice;

          // ── Auto-correct quantity against live stock ────────────────────
          let qty = item.quantity;
          if (qty > liveStock) {
            qty = liveStock;
            needsSync = true;
          }

          // ── Detect any metadata drift ──────────────────────────────────
          if (
            item.id !== resolvedId ||
            item.stock !== liveStock ||
            item.price !== livePrice
          ) {
            needsSync = true;
          }

          return {
            ...item,
            id: resolvedId,
            quantity: qty,
            stock: liveStock,
            price: livePrice,
            image: product.mainImage || item.image, // Also refresh image URL
          };
        }).filter(item => item.quantity > 0);

        // Check if items were removed
        if (validated.length !== cartState.items.length) {
          needsSync = true;
        }

        setRefreshedPrices(prices);

        if (validationFailed) {
          setRefreshError('مش قادرين نتأكد من توفر بعض المنتجات دلوقتي. حدّث الصفحة قبل ما تكمل الطلب.');
        }

        // Sync corrected items back to CartContext → localStorage
        if (needsSync && typeof syncItems === 'function') {
          syncItems(validated);
        }

        cartIdentityRef.current = cartIdentity;
      } catch (error) {
        console.error('[Cart] Refresh failed:', error);
        setRefreshError('فشل تحديث السلة. جرب تاني.');
      } finally {
        setLoading(false);
      }
    };

    refreshCart();
  }, [cartState.items, syncItems]);

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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300" />
          <p className="text-[#b3b3b3] text-sm animate-pulse">Loading cart...</p>
        </div>
      </div>
    );
  }

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
                    disabled={!!refreshError || loading}
                    className="w-full bg-transparent border border-white text-white py-4 font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white"
                  >
                    PROCEED TO CHECKOUT
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
