"use client";

import React, { createContext, useContext, useReducer, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  nameArabic?: string;
  image: string;
  price: number;
  quantity: number;
  stock?: number;
  variant?: {
    name: string;
    color?: string;
  };
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

const variantsMatch = (a?: CartItem['variant'], b?: CartItem['variant']) =>
  a?.name === b?.name && a?.color === b?.color;

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { id: string; variant?: CartItem['variant'] } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; variant?: CartItem['variant']; quantity: number; maxStock?: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] };

const CartContext = createContext<{
  state: CartState;
  addItem: (item: Omit<CartItem, 'quantity'>, quantityToAdd?: number, maxStock?: number) => void;
  removeItem: (id: string, variant?: CartItem['variant']) => void;
  updateQuantity: (id: string, variant: CartItem['variant'], quantity: number, maxStock?: number) => void;
  syncItems: (items: CartItem[]) => void;
  clearCart: () => void;
} | null>(null);

// Cart reducer
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(item =>
        item.id === action.payload.id && variantsMatch(item.variant, action.payload.variant)
      );

      let newItems;
      if (existingItemIndex >= 0) {
        // Update existing item quantity with stock validation
        const existingItem = state.items[existingItemIndex];
        const quantityToAdd = action.payload.quantity || 1;
        const newQuantity = existingItem.quantity + quantityToAdd;

        // Check if adding would exceed stock
        if (action.payload.stock !== undefined && newQuantity > action.payload.stock) {
          return state; // Don't add if it would exceed stock
        }

        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        // Add new item with stock validation
        const quantityToAdd = action.payload.quantity || 1;
        if (action.payload.stock !== undefined && quantityToAdd > action.payload.stock) {
          return state; // Don't add if it would exceed stock
        }

        newItems = [...state.items, { ...action.payload, quantity: quantityToAdd }];
      }

      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return { items: newItems, total, itemCount };
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => 
        !(item.id === action.payload.id && variantsMatch(item.variant, action.payload.variant))
      );
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      
      return { items: newItems, total, itemCount };
    }
    
    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item => {
        const isMatch = item.id === action.payload.id && variantsMatch(item.variant, action.payload.variant);
        
        if (isMatch) {
          const newQuantity = action.payload.maxStock !== undefined
            ? Math.min(Math.max(0, action.payload.quantity), action.payload.maxStock)
            : Math.max(0, action.payload.quantity);
          
          return {
            ...item,
            quantity: newQuantity
          };
        }
        return item;
      }).filter(item => item.quantity > 0);

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

  // Load cart from localStorage on mount — always sanitize prices and migrate IDs
  useEffect(() => {
    const loadCartSafe = async () => {
      try {
        const savedCart = localStorage.getItem('cart');
        if (!savedCart) return;

        let items: CartItem[];
        try {
          items = JSON.parse(savedCart);
          if (!Array.isArray(items)) {
            console.warn('[Cart] localStorage had non-array cart data — resetting');
            localStorage.removeItem('cart');
            return;
          }
        } catch {
          console.warn('[Cart] localStorage had corrupt cart JSON — resetting');
          localStorage.removeItem('cart');
          return;
        }

        // Filter out items missing required fields
        items = items.filter(item => item.id && item.name && typeof item.price === 'number');

        if (items.length === 0) {
          dispatch({ type: 'LOAD_CART', payload: [] });
          return;
        }

        // Fetch the live product list from MongoDB for price/ID validation
        let liveProducts: any[] = [];
        try {
          const response = await fetch('/api/products?limit=200');
          const data = await response.json();
          if (data.success && Array.isArray(data.products)) {
            liveProducts = data.products;
          }
        } catch {
          // API failed — load cart as-is (cart page will re-validate)
          dispatch({ type: 'LOAD_CART', payload: items });
          return;
        }

        if (liveProducts.length === 0) {
          dispatch({ type: 'LOAD_CART', payload: items });
          return;
        }

        // Build live price map for fast lookups
        const livePriceMap: Record<string, number> = {};
        liveProducts.forEach((p: any) => {
          if (p._id) {
            const pid = p._id.toString();
            livePriceMap[pid] = p.price;
            if (Array.isArray(p.variants)) {
              p.variants.forEach((v: any) => {
                if (typeof v.price === 'number' && v.price > 0) {
                  livePriceMap[`${pid}_${v.name}`] = v.price;
                }
              });
            }
          }
        });

        // Sanitize every cart item: migrate legacy IDs & refresh prices
        const sanitizedItems = items
          .map(item => {
            let actualId = item.id;

            // Auto-Migrate: if cart item has a non-MongoDB ID, find via name matching
            if (!/^[0-9a-fA-F]{24}$/.test(actualId)) {
              const matchingLiveProduct = liveProducts.find(
                (lp: any) => lp.name?.trim().toLowerCase() === item.name?.trim().toLowerCase()
              );
              if (matchingLiveProduct?._id) {
                actualId = matchingLiveProduct._id.toString();
              } else {
                // Product not found in DB — remove from cart
                return null;
              }
            }

            const variantKey = item.variant?.name;
            const liveVariantPrice = variantKey ? livePriceMap[`${actualId}_${variantKey}`] : undefined;
            const liveBasePrice = livePriceMap[actualId];
            const freshPrice = liveVariantPrice ?? liveBasePrice;

            return {
              ...item,
              id: actualId,
              price: freshPrice ?? item.price,
            };
          })
          .filter((item): item is CartItem => item !== null);

        dispatch({ type: 'LOAD_CART', payload: sanitizedItems });
      } catch (error) {
        console.error('[Cart] Failed to load cart from localStorage:', error);
      }
    };

    loadCartSafe();
  }, []);

  // Save cart to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(state.items));
    } catch (error) {
      // Failed to save to localStorage, silent failure acceptable
    }
  }, [state.items]);

  // Cart actions
  const addItem = (item: Omit<CartItem, 'quantity'>, quantityToAdd: number = 1, maxStock?: number) => {
    dispatch({ type: 'ADD_ITEM', payload: { ...item, quantity: quantityToAdd, stock: item.stock || maxStock } });
  };

  const removeItem = (id: string, variant?: CartItem['variant']) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id, variant } });
  };

  const updateQuantity = (id: string, variant: CartItem['variant'], quantity: number, maxStock?: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, variant, quantity, maxStock } });
  };

  const syncItems = (items: CartItem[]) => {
    dispatch({ type: 'LOAD_CART', payload: items });
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
      syncItems,
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



