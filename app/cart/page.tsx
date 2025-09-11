"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../sections/Nav';
import { useCart } from '../../contexts/CartContext';

const CartPage = () => {
  const router = useRouter();
  const { state: cartState, updateQuantity, removeItem, clearCart } = useCart();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshedPrices, setRefreshedPrices] = useState<Record<string, number>>({});

  // Load cart items and refresh prices from server
  useEffect(() => {
    const refreshCartPrices = async () => {
      if (cartState.items.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Get unique product IDs from cart
        const productIds = [...new Set(cartState.items.map(item => item.id))];
        
        // Fetch current prices from server
        const pricePromises = productIds.map(async (id) => {
          try {
            const response = await fetch(`/api/products/${id}`);
            if (response.ok) {
              const data = await response.json();
              return { id, price: data.product?.price || 0 };
            }
          } catch (error) {
            console.error(`Failed to fetch price for product ${id}:`, error);
          }
          return { id, price: 0 };
        });

        const priceResults = await Promise.all(pricePromises);
        const priceMap: Record<string, number> = {};
        priceResults.forEach(({ id, price }) => {
          priceMap[id] = price;
        });

        setRefreshedPrices(priceMap);
        console.log('🔄 Cart prices refreshed from server:', priceMap);
      } catch (error) {
        console.error('❌ Error refreshing cart prices:', error);
      } finally {
        setLoading(false);
      }
    };

    refreshCartPrices();
  }, [cartState.items.length]);

  // Calculate totals using refreshed prices when available
  const subtotal = cartState.items.reduce((sum, item) => {
    const currentPrice = refreshedPrices[item.id] || item.price;
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
    <div className="min-h-screen bg-black text-white">
      <Nav />
      
      <div className="pt-20 lg:pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="text-white hover:text-gray-300 transition-colors duration-300 mb-6 flex items-center"
            >
              ← Continue Shopping
            </button>
            
            <div className="flex items-center justify-between">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold uppercase tracking-wider">
                CART
              </h1>
              
              {/* Debug Info */}
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400">
                  Items: {cartState.itemCount} | Total: L.E {cartState.total.toLocaleString()}
                </div>
                
              </div>
            </div>
          </div>

          {cartState.items.length === 0 ? (
            /* Empty Cart */
            <div className="text-center py-16 lg:py-24">
              <h2 className="text-2xl lg:text-3xl font-medium text-gray-300 mb-4">Your cart is empty</h2>
              <p className="text-gray-400 mb-8">Add some calisthenics equipment to get started!</p>
              <button
                onClick={() => router.push('/shop')}
                className="bg-white text-black px-8 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors duration-300"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              
              {/* Left Side - Cart Items */}
              <div className="lg:col-span-2">
                {cartState.items.map((item) => {
                  console.log('Cart item:', item.name, 'Stock:', item.stock, 'Quantity:', item.quantity);
                  return (
                  <div key={`${item.id}-${JSON.stringify(item.variant)}`} className="bg-gray-900/50 rounded-lg p-4 mb-4">
                    {/* Mobile Layout - Stack vertically */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      
                      {/* Top Row - Image and Product Info */}
                      <div className="flex items-start gap-4 flex-1">
                        {/* Product Image */}
                        <div
                          className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity duration-300 rounded-lg"
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
                          <h3 className="text-white font-medium text-sm sm:text-base mb-2 leading-tight">
                            {item.nameArabic || item.name}
                          </h3>
                          
                          {item.variant && (
                            <p className="text-gray-400 text-xs sm:text-sm mb-2">
                              {item.variant.name}
                            </p>
                          )}
                          
                          {/* Price - Show on mobile */}
                          <p className="text-white font-bold text-sm sm:hidden">
                            {((refreshedPrices[item.id] || item.price) * item.quantity).toLocaleString()} L.E
                            {refreshedPrices[item.id] && refreshedPrices[item.id] !== item.price && (
                              <span className="text-green-400 text-xs ml-1">(Updated)</span>
                            )}
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
                            className={`w-8 h-8 border flex items-center justify-center font-bold text-sm transition-all duration-300 rounded ${
                              item.quantity <= 1
                                ? 'border-gray-600 text-gray-600 cursor-not-allowed bg-gray-800'
                                : 'border-white text-white hover:bg-white hover:text-black bg-transparent'
                            }`}
                          >
                            -
                          </button>
                          <span className="text-white font-bold w-8 text-center text-sm bg-gray-800 px-2 py-1 rounded">
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
                            className={`w-8 h-8 border flex items-center justify-center font-bold text-sm transition-all duration-300 rounded ${
                              item.stock !== undefined && item.quantity >= item.stock
                                ? 'border-gray-600 text-gray-600 cursor-not-allowed bg-gray-800'
                                : 'border-white text-white hover:bg-white hover:text-black bg-transparent'
                            }`}
                          >
                            +
                          </button>
                        </div>
                        
                        {/* Price - Desktop only */}
                        <div className="hidden sm:block text-right">
                          <div className="text-white font-bold text-base">
                            {((refreshedPrices[item.id] || item.price) * item.quantity).toLocaleString()} L.E
                            {refreshedPrices[item.id] && refreshedPrices[item.id] !== item.price && (
                              <span className="text-green-400 text-xs ml-2">(Updated)</span>
                            )}
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
                <div className="bg-gray-100 text-black p-6 lg:p-8  sticky top-24">
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
                    
                    <div className="border-t border-gray-300 pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>L.E {total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-black text-white py-4 font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors duration-300"
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



