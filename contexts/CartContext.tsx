"use client";

import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface CartItem {
  id: string;
  name: string;
  nameArabic?: string;
  image: string;
  price: number;
  quantity: number;
  stock?: number;
  variant?: {
    name: string;
    size: string;
    color: string;
  };
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { id: string; variant?: any } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number; maxStock?: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] };

const CartContext = createContext<{
  state: CartState;
  addItem: (item: Omit<CartItem, 'quantity'>, maxStock?: number) => void;
  removeItem: (id: string, variant?: any) => void;
  updateQuantity: (id: string, quantity: number, maxStock?: number) => void;
  clearCart: () => void;
} | null>(null);

// Cart reducer
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(item =>
        item.id === action.payload.id &&
        JSON.stringify(item.variant) === JSON.stringify(action.payload.variant)
      );

      let newItems;
      if (existingItemIndex >= 0) {
        // Update existing item quantity with stock validation
        const existingItem = state.items[existingItemIndex];
        const newQuantity = existingItem.quantity + (action.payload.quantity || 1);

        // Check if adding would exceed stock
        if (action.payload.stock !== undefined && newQuantity > action.payload.stock) {
          console.log(`Cannot add more items. Stock limit: ${action.payload.stock}, Current: ${existingItem.quantity}, Trying to add: ${action.payload.quantity || 1}`);
          return state; // Don't add if it would exceed stock
        }

        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        // Add new item with stock validation
        if (action.payload.stock !== undefined && (action.payload.quantity || 1) > action.payload.stock) {
          console.log(`Cannot add item. Stock limit: ${action.payload.stock}, Trying to add: ${action.payload.quantity || 1}`);
          return state; // Don't add if it would exceed stock
        }

        newItems = [...state.items, { ...action.payload, quantity: action.payload.quantity || 1 }];
      }

      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return { items: newItems, total, itemCount };
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => 
        !(item.id === action.payload.id && 
          JSON.stringify(item.variant) === JSON.stringify(action.payload.variant))
      );
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      
      return { items: newItems, total, itemCount };
    }
    
    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? {
              ...item,
              quantity: action.payload.maxStock !== undefined
                ? Math.min(Math.max(0, action.payload.quantity), action.payload.maxStock)
                : Math.max(0, action.payload.quantity)
            }
          : item
      ).filter(item => item.quantity > 0);

      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return { items: newItems, total, itemCount };
    }
    
    case 'CLEAR_CART':
      return { items: [], total: 0, itemCount: 0 };
    
    case 'LOAD_CART': {
      const items = action.payload;
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      
      return { items, total, itemCount };
    }
    
    default:
      return state;
  }
};

// Cart provider component
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const items = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: items });
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
  }, []);

  // Save cart to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(state.items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [state.items]);

  // Cart actions
  const addItem = (item: Omit<CartItem, 'quantity'>, maxStock?: number) => {
    dispatch({ type: 'ADD_ITEM', payload: { ...item, quantity: 1, stock: item.stock || maxStock } });
  };

  const removeItem = (id: string, variant?: any) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id, variant } });
  };

  const updateQuantity = (id: string, quantity: number, maxStock?: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity, maxStock } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  return (
    <CartContext.Provider value={{
      state,
      addItem,
      removeItem,
      updateQuantity,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

// Hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};



