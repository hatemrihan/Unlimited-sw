"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../sections/Nav';
import { useCart } from '../../contexts/CartContext';

const CartPage = () => {
  const router = useRouter();
  const { state: cartState, updateQuantity, removeItem, clearCart, syncItems } = useCart();
  const [loading, setLoading] = useState<boolean>(true);
  // Key format: "productId_variantName" or "productId_default" for items without variants
  const [refreshedPrices, setRefreshedPrices] = useState<Record<string, number>>({});

  // Load cart items and refresh prices from server - FIXED to handle variant-specific prices
  useEffect(() => {
    const refreshCartPrices = async () => {
      if (cartState.items.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Get unique product IDs from cart
        const productIds = [...new Set(cartState.items.map(item => item.id))];

        // Fetch products from server
        const productPromises = productIds.map(async (id) => {
          try {
            // For static IDs, we can't fetch by ID — we'll handle migration below
            if (!id.match(/^[0-9a-fA-F]{24}$/)) {
              return { id, product: null, isLegacy: true };
            }
            const response = await fetch(`/api/products/${id}`);
            if (response.ok) {
              const data = await response.json();
              return { id, product: data.product, isLegacy: false };
            }
          } catch (error) {
            console.error(`Failed to fetch product ${id}:`, error);
          }
          return { id, product: null, isLegacy: false };
        });

        const productResults = await Promise.all(productPromises);

        // If any legacy static IDs exist, fetch the full product list to find matching MongoDB IDs
        const hasLegacyIds = productResults.some(r => r.isLegacy);
        let allDbProducts: any[] = [];
        if (hasLegacyIds) {
          try {
            const allRes = await fetch('/api/products');
            const allData = await allRes.json();
            if (allData.success && allData.products) {
              allDbProducts = allData.products;
            }
          } catch (e) {
            console.error('Failed to fetch product list for legacy ID migration:', e);
          }
        }

        // Create a map of productId -> product for easy lookup
        const productMap: Record<string, any> = {};
        productResults.forEach(({ id, product }) => {
          if (product) {
            productMap[id] = product;
          }
        });

        // Now build price map and evaluate LIVE STOCK validations!
        const priceMap: Record<string, number> = {};
        let needsSync = false;

        const validatedItems = cartState.items.map((item) => {
          let currentId = item.id;

          // 🔄 AUTO-MIGRATE: Upgrade legacy static IDs to real MongoDB ObjectIds
          if (!currentId.match(/^[0-9a-fA-F]{24}$/)) {
            const matchingDbProduct = allDbProducts.find(
              (p: any) => p.name === item.name || p.name?.trim() === item.name?.trim()
            );
            if (matchingDbProduct && matchingDbProduct._id) {
              const newId = matchingDbProduct._id.toString();
              console.log(`🔄 [Cart Migration] Upgraded "${item.name}" from legacy ID "${currentId}" → "${newId}"`);
              currentId = newId;
              productMap[currentId] = matchingDbProduct;
              needsSync = true;
            } else {
              // Product doesn't exist in DB at all — keep as-is, order service will handle gracefully
              console.warn(`⚠️ [Cart] Product "${item.name}" has legacy ID "${currentId}" and no DB match found`);
              return { ...item };
            }
          }

          const product = productMap[currentId];
          if (!product) return { ...item, id: currentId }; // Safety fallback

          const variantKey = item.variant?.name || 'default';
          const priceKey = `${currentId}_${variantKey}`;

          let currentPrice = product.price || 0;
          let availableStock = typeof product.stock === 'number' ? product.stock : 0;

          if (item.variant && product.variants && Array.isArray(product.variants)) {
            const matchingVariant = product.variants.find((v: any) => v.name === item.variant?.name);
            if (matchingVariant) {
              if (matchingVariant.price !== undefined && matchingVariant.price > 0) {
                currentPrice = matchingVariant.price;
              }
              if (typeof matchingVariant.stock === 'number') {
                availableStock = matchingVariant.stock;
              }
            }
          }

          priceMap[priceKey] = currentPrice;

          // Enforce math boundaries naturally
          let validatedQuantity = item.quantity;
          if (validatedQuantity > availableStock) {
            validatedQuantity = availableStock;
            needsSync = true;
          } else if (item.stock !== availableStock || currentId !== item.id) {
            // Background metadata optimization or ID migration happened
            needsSync = true;
          }

          return {
            ...item,
            id: currentId, // Apply migrated ID
            quantity: validatedQuantity,
            stock: availableStock
          };
        }).filter(item => item.quantity > 0); // Silently eject completely sold out items
        
        // Did an item get removed completely?
        if (validatedItems.length !== cartState.items.length) {
          needsSync = true; 
        }

        setRefreshedPrices(priceMap);

        // Intelligently overwrite the local storage cart gracefully
        if (needsSync && typeof syncItems === 'function') {
           syncItems(validatedItems);
           console.log('🔄 Cart intelligently corrected (stock/price/ID migration applied)');
        }

      } catch (error) {
        console.error('❌ Error refreshing cart prices/stock:', error);
      } finally {
        setLoading(false);
      }
    };

    refreshCartPrices();
  }, [cartState.items]);

  // Calculate totals using refreshed prices when available - FIXED to use variant-aware keys
  const subtotal = cartState.items.reduce((sum, item) => {
    const variantKey = item.variant?.name || 'default';
    const priceKey = `${item.id}_${variantKey}`;
    const currentPrice = refreshedPrices[priceKey] || item.price;
    return sum + (currentPrice * item.quantity);
  }, 0);
  const total = subtotal; // Add shipping/tax calculation here if needed

  // Handle quantity updates with stock validation
  const handleUpdateQuantity = (itemId: string, variant: any, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Find the exact item with variant to remove
      const itemToRemove = cartState.items.find(item =>
        item.id === itemId &&
        JSON.stringify(item.variant) === JSON.stringify(variant)
      );
      if (itemToRemove) {
        removeItem(itemToRemove.id, itemToRemove.variant);
      }
      return;
    }

    // Find the exact item with variant
    const item = cartState.items.find(item =>
      item.id === itemId &&
      JSON.stringify(item.variant) === JSON.stringify(variant)
    );

    if (item) {
      // Validate against stock if available
      const maxQuantity = item.stock !== undefined ? item.stock : 999;
      const validQuantity = Math.min(newQuantity, maxQuantity);
      updateQuantity(item.id, item.variant, validQuantity, item.stock);
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    if (cartState.items.length === 0) return;

    // Redirect to checkout page
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
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
            >
              ← Continue Shopping
            </button>

            <div className="flex items-center justify-between">
              <h1 className="text-xl px-4 sm:text-xl md:text-2xl lg:text-3xl font-bold uppercase tracking-wider text-[#b3b3b3]">
                CART
              </h1>

              {/* Debug Info */}
              <div className="flex items-center gap-4">
                <div className="text-sm text-[#b3b3b3]">
                  Items: {cartState.itemCount} | Total: L.E {cartState.total.toLocaleString()}
                </div>

              </div>
            </div>
          </div>

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
              {/* Left Side - Cart Items */}
              <div className="lg:col-span-2">
                {cartState.items.map((item) => {
                  return (
                    <div key={`${item.id}-${JSON.stringify(item.variant)}`} className="bg-stone-900/50  p-4 mb-4">
                      {/* Mobile Layout - Stack vertically */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                        {/* Top Row - Image and Product Info */}
                        <div className="flex items-start gap-4 flex-1">
                          {/* Product Image */}
                          <div
                            className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity duration-300 "
                            onClick={() => router.push(`/product/${item.id}`)}
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[#b3b3b3] font-medium text-sm sm:text-base mb-2 leading-tight">
                              {item.nameArabic || item.name}
                            </h3>

                            {item.variant && (
                              <p className="text-[#b3b3b3] text-xs sm:text-sm mb-2">
                                {item.variant.name}
                              </p>
                            )}

                            {/* Price - Show on mobile - FIXED to use variant-aware key */}
                            <p className="text-[#b3b3b3] font-bold text-sm sm:hidden">
                              {((refreshedPrices[`${item.id}_${item.variant?.name || 'default'}`] || item.price) * item.quantity).toLocaleString()} L.E
                            </p>
                          </div>
                        </div>

                        {/* Bottom Row - Quantity and Price */}
                        <div className="flex items-center justify-between sm:justify-end sm:gap-6">
                          {/* Quantity Controls */}
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUpdateQuantity(item.id, item.variant, item.quantity - 1);
                              }}
                              disabled={item.quantity <= 1}
                              className={`w-8 h-8 border border-white flex items-center justify-center font-bold text-sm transition-all duration-300  ${item.quantity <= 1
                                  ? 'border-white text-white cursor-not-allowed bg-transparent'
                                  : 'border-white text-white hover:bg-white hover:text-black bg-transparent'
                                }`}
                            >
                              -
                            </button>
                            <span className="text-[#b3b3b3] font-bold w-8 text-center text-sm  px-2 py-1 ">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUpdateQuantity(item.id, item.variant, item.quantity + 1);
                              }}
                              disabled={item.stock !== undefined && item.quantity >= item.stock}
                              className={`w-8 h-8 border border-white flex items-center justify-center font-bold text-sm transition-all duration-300  ${item.stock !== undefined && item.quantity >= item.stock
                                  ? 'border-white text-white cursor-not-allowed bg-transparent'
                                  : 'border-white text-white hover:bg-white hover:text-black bg-transparent'
                                }`}
                            >
                              +
                            </button>
                          </div>

                          {/* Price - Desktop only */}
                          <div className="hidden sm:block text-right">
                            {/* FIXED to use variant-aware key */}
                            <div className="text-[#b3b3b3] font-bold text-base">
                              {((refreshedPrices[`${item.id}_${item.variant?.name || 'default'}`] || item.price) * item.quantity).toLocaleString()} L.E
                            </div>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => {
                              // Find the exact item with variant to remove
                              const itemToRemove = cartState.items.find(cartItem =>
                                cartItem.id === item.id &&
                                JSON.stringify(cartItem.variant) === JSON.stringify(item.variant)
                              );
                              if (itemToRemove) {
                                removeItem(itemToRemove.id, itemToRemove.variant);
                              }
                            }}
                            className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors duration-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Side - Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-stone-900/50 text-white p-6 lg:p-8  sticky top-24">
                  <h2 className="text-lg lg:text-xl font-bold mb-6 uppercase tracking-wider">
                    ORDER SUMMARY
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium">L.E {subtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="font-medium">Calculated at checkout</span>
                    </div>

                    <div className="border-t border-white pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>L.E {total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full bg-transparent border border-white text-white py-4 font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors duration-300"
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



