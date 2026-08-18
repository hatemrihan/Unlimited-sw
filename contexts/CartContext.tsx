"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

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
  /**
   * Adds an item. `added` is false when stock would be exceeded, and
   * `remaining` is how many more could still be added — so the button can say
   * so instead of appearing broken.
   */
  addItem: (
    item: Omit<CartItem, 'quantity'>,
    quantityToAdd?: number,
    maxStock?: number
  ) => { added: boolean; remaining: number };
  removeItem: (id: string, variant?: CartItem['variant']) => void;
  updateQuantity: (id: string, variant: CartItem['variant'], quantity: number, maxStock?: number) => void;
  syncItems: (items: CartItem[]) => void;
  clearCart: () => void;
  /** Re-pulls live prices from the database. Returns false if it could not reach the API. */
  refreshPrices: () => Promise<boolean>;
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

/**
 * Fetches just the products this cart holds.
 *
 * This used to be `GET /api/products?limit=200`, fired on every page load by
 * every visitor with a non-empty cart: the whole catalogue, to re-price at most
 * a handful of lines. `limit=200` was also silently capped to 100 by the API,
 * so a shop with more products would have quietly dropped the rest — the read
 * was both wasteful and wrong. The batch endpoint takes the ids we actually
 * care about.
 */
async function fetchCartProducts(ids: string[]): Promise<any[] | null> {
  if (ids.length === 0) return [];

  try {
    const response = await fetch('/api/products/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.success && Array.isArray(data.products) ? data.products : null;
  } catch {
    // Null means "could not check", which callers must not confuse with
    // "checked, and these products are gone".
    return null;
  }
}

/**
 * Replaces every stored price with the live one.
 *
 * Shared by the mount load and by `refreshPrices` so the two can never drift
 * apart — a cart sanitised one way on load and another way on refresh is how
 * "the price changed between the cart and checkout" bugs are born.
 *
 * An item whose product no longer exists is dropped, because it cannot be
 * ordered and leaving it in the cart only produces a failure at submit.
 *
 * The name-matching migration for pre-MongoDB cart ids used to live here. It
 * was one of four copies of the same idea — this one, the cart page, the
 * checkout page, and `resolveLegacyProductIds` on the server. Only the server's
 * copy cannot be bypassed, so only the server's copy is kept; an id that old
 * now simply finds no product and is dropped, which is what the other three
 * did in the end anyway.
 */
function applyLivePrices(items: CartItem[], liveProducts: any[]): CartItem[] {
  const livePriceMap: Record<string, number> = {};

  liveProducts.forEach((p: any) => {
    if (!p._id) return;
    const pid = p._id.toString();
    livePriceMap[pid] = p.price;
    if (Array.isArray(p.variants)) {
      p.variants.forEach((v: any) => {
        if (typeof v.price === 'number' && v.price > 0) {
          livePriceMap[`${pid}_${v.name}`] = v.price;
        }
      });
    }
  });

  return items
    .map(item => {
      const liveBasePrice = livePriceMap[item.id];

      // No live product under this id: it was deleted, deactivated, or the id
      // predates MongoDB. Either way it cannot be ordered.
      if (liveBasePrice === undefined) return null;

      const variantKey = item.variant?.name;
      const liveVariantPrice = variantKey ? livePriceMap[`${item.id}_${variantKey}`] : undefined;

      return {
        ...item,
        price: liveVariantPrice ?? liveBasePrice,
      };
    })
    .filter((item): item is CartItem => item !== null);
}

// Cart provider component
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0
  });

  /**
   * Re-reads the cart from storage, migrates legacy ids and pulls live prices
   * from MongoDB.
   *
   * This used to be trapped inside the mount effect below, which meant prices
   * were only ever refreshed on a full page load. When the server refused an
   * order with `PRICING_MISMATCH` — "prices changed, refresh the page" — the
   * checkout page had no way to act on its own advice, so the customer was left
   * at the bottom of a filled-in form with nothing to press. Lifting it out is
   * what makes that recovery possible.
   *
   * Returns true when it managed to reach the API, so callers can tell "prices
   * are now current" from "we could not check".
   */
  const refreshPrices = useCallback(async (): Promise<boolean> => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (!savedCart) return true;

      let items: CartItem[];
      try {
        items = JSON.parse(savedCart);
        if (!Array.isArray(items)) return false;
      } catch {
        return false;
      }

      items = items.filter(item => item.id && item.name && typeof item.price === 'number');
      if (items.length === 0) {
        dispatch({ type: 'LOAD_CART', payload: [] });
        return true;
      }

      const products = await fetchCartProducts([...new Set(items.map(item => item.id))]);
      if (products === null) return false;

      dispatch({ type: 'LOAD_CART', payload: applyLivePrices(items, products) });
      return true;
    } catch {
      return false;
    }
  }, []);

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

        // Show the cart first, price it second.
        //
        // This used to wait for the network before dispatching anything, so on
        // a slow connection the customer's cart was EMPTY — no badge in the
        // nav, an empty cart page — until the request came back. The stored
        // copy is what they put there; it is worth showing while the live
        // prices are on their way, and the server prices the order in the end
        // regardless.
        dispatch({ type: 'LOAD_CART', payload: items });

        // Re-price the lines this cart actually holds.
        const liveProducts = await fetchCartProducts([...new Set(items.map(item => item.id))]);

        // Could not reach the API — keep what is already shown.
        if (liveProducts === null) return;

        dispatch({ type: 'LOAD_CART', payload: applyLivePrices(items, liveProducts) });
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
  //
  // All memoised on a stable `dispatch`, so a component may depend on one in an
  // effect without re-running it on every render. The cart page needs that: its
  // availability check depends on `syncItems`, and an unmemoised version turned
  // that effect into a loop that had to be defused with a ref.

  /**
   * Adds an item, and says whether it went in.
   *
   * The reducer refuses an add that would exceed stock by returning the state
   * untouched — correct, but silent: `addItem` returned void, so the button had
   * no way to tell "added" from "we ignored you", and the customer pressed a
   * button that did nothing. The same limit is checked here so the answer can
   * be given, and `remaining` is what the UI needs to say "only 2 left".
   */
  const addItem = useCallback((
    item: Omit<CartItem, 'quantity'>,
    quantityToAdd: number = 1,
    maxStock?: number
  ): { added: boolean; remaining: number } => {
    const stock = item.stock ?? maxStock;
    const existing = state.items.find(
      line => line.id === item.id && variantsMatch(line.variant, item.variant)
    );
    const alreadyInCart = existing?.quantity ?? 0;

    if (stock !== undefined && alreadyInCart + quantityToAdd > stock) {
      return { added: false, remaining: Math.max(0, stock - alreadyInCart) };
    }

    dispatch({ type: 'ADD_ITEM', payload: { ...item, quantity: quantityToAdd, stock } });
    return { added: true, remaining: stock === undefined ? Infinity : stock - alreadyInCart - quantityToAdd };
  }, [state.items]);

  const removeItem = useCallback((id: string, variant?: CartItem['variant']) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id, variant } });
  }, []);

  const updateQuantity = useCallback((
    id: string,
    variant: CartItem['variant'],
    quantity: number,
    maxStock?: number
  ) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, variant, quantity, maxStock } });
  }, []);

  const syncItems = useCallback((items: CartItem[]) => {
    dispatch({ type: 'LOAD_CART', payload: items });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  return (
    <CartContext.Provider value={{
      state,
      addItem,
      removeItem,
      updateQuantity,
      syncItems,
      clearCart,
      refreshPrices
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



