"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../sections/Nav';
import { useCart } from '../../contexts/CartContext';

const CartPage = () => {
  const router = useRouter();
  const { state: cartState, updateQuantity, removeItem, clearCart } = useCart();
  const [loading, setLoading] = useState<boolean>(true);

  // Load cart items from localStorage on mount
  useEffect(() => {
    setLoading(false);
  }, []);

  // Calculate totals
  const subtotal = cartState.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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
      updateQuantity(item.id, validQuantity, item.stock);
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
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold uppercase tracking-wider">
              CART
            </h1>
          </div>

          {cartState.items.length === 0 ? (
            /* Empty Cart */
            <div className="text-center py-16 lg:py-24">
              <h2 className="text-2xl lg:text-3xl font-medium text-gray-300 mb-4">Your cart is empty</h2>
              <p className="text-gray-400 mb-8">Add some calisthenics equipment to get started!</p>
              <button
                onClick={() => router.push('/')}
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
                  <div key={`${item.id}-${JSON.stringify(item.variant)}`} className="flex items-start sm:items-center gap-3 sm:gap-4 lg:gap-6 py-4 sm:py-6 border-b border-gray-700 last:border-b-0">
                    
                    {/* Product Image */}
                    <div
                      className="w-20 h-20 lg:w-24 lg:h-24 bg-gray-800 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity duration-300"
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
                      <h3 className="text-white font-medium text-sm lg:text-base mb-1">
                        {item.nameArabic || item.name}
                      </h3>
                      
                      {item.variant && (
                        <p className="text-gray-400 text-xs lg:text-sm">
                          {item.variant.name} - {item.variant.color}
                        </p>
                      )}
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                      <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.variant, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className={`w-6 h-6 sm:w-8 sm:h-8 border flex items-center justify-center font-bold text-sm sm:text-lg transition-colors duration-300 ${
                            item.quantity <= 1
                              ? 'border-gray-600 text-gray-600 cursor-not-allowed'
                              : 'border-white text-white hover:bg-white hover:text-black'
                          }`}
                        >
                          -
                        </button>
                        <span className="text-white font-medium w-6 sm:w-8 text-center text-sm sm:text-base">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.variant, item.quantity + 1)}
                          disabled={item.stock !== undefined && item.quantity >= item.stock}
                          className={`w-6 h-6 sm:w-8 sm:h-8 border flex items-center justify-center font-bold text-sm sm:text-lg transition-colors duration-300 ${
                            item.stock !== undefined && item.quantity >= item.stock
                              ? 'border-gray-600 text-gray-600 cursor-not-allowed'
                              : 'border-white text-white hover:bg-white hover:text-black'
                          }`}
                        >
                          +
                        </button>
                      </div>
                      {item.stock !== undefined ? (
                        item.stock > 0 ? (
                          <span className="text-xs text-gray-400">
                            {item.stock - item.quantity} left in stock
                          </span>
                        ) : (
                          <span className="text-xs text-red-400">
                            Out of stock
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">
                          Stock not available
                        </span>
                      )}
                    </div>
                    
                    {/* Price */}
                    <div className="text-right">
                      <div className="text-white font-bold text-sm lg:text-base">
                        {(item.price * item.quantity).toLocaleString()} L.E
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
                      className="text-gray-400 hover:text-white transition-colors duration-300 ml-2"
                    >
                      Remove
                    </button>
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



