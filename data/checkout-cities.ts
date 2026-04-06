import { nameToSlug, STATIC_PRODUCTS } from './products';

/**
 * STATIC CITY PRICING FALLBACK
 * Used when MongoDB is unreachable.
 * Mirrors the exact shape returned by /api/checkout/cities
 * Each product gets its own shipping/COD rates via productPricing map.
 */

export interface StaticCity {
  _id: string;
  governorate: string;
  cityName: string;
  shippingCost: number;
  codFee: number;
  isActive: boolean;
  productPricing: Record<string, {
    price: number;
    shippingCost: number;
    codFee: number;
    isActive: boolean;
  }>;
}

// Static product IDs matching data/products.ts
const P1 = 'static-product-1'; // Wall-mounted pull-up bar + Wall-parallel bar — 4999
const P2 = 'static-product-2'; // Wall-mounted pull-up bar — 3550
const P3 = 'static-product-3'; // Wall-parallel bar — 1580
const P4 = 'static-product-4'; // Floor parallettes — 1599

export const STATIC_CITIES: StaticCity[] = [
  {
    _id: 'city-cairo',
    governorate: 'Cairo',
    cityName: 'Cairo',
    shippingCost: 50,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 285, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 225, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 155, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 155, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-giza',
    governorate: 'Giza',
    cityName: 'Giza',
    shippingCost: 50,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 285, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 225, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 155, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 155, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-alexandria',
    governorate: 'Alexandria',
    cityName: 'Alexandria',
    shippingCost: 60,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 285, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 225, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 155, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 155, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-ismailia',
    governorate: 'Ismailia',
    cityName: 'Ismailia',
    shippingCost: 65,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 339, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 267, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 173, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 173, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-suez',
    governorate: 'Suez',
    cityName: 'Suez',
    shippingCost: 65,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 339, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 267, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 173, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 173, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-port-said',
    governorate: 'Port Said',
    cityName: 'Port Said',
    shippingCost: 65,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 339, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 267, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 173, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 173, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-dakahlia',
    governorate: 'Dakahlia',
    cityName: 'Dakahlia',
    shippingCost: 60,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 339, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 267, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 173, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 173, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-sharqia',
    governorate: 'Sharqia',
    cityName: 'Sharqia',
    shippingCost: 60,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 339, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 267, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 173, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 173, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-gharbia',
    governorate: 'Gharbia',
    cityName: 'Gharbia',
    shippingCost: 60,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 339, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 267, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 173, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 173, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-beheira',
    governorate: 'Beheira',
    cityName: 'Beheira',
    shippingCost: 65,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 339, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 267, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 173, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 173, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-kafr-el-sheikh',
    governorate: 'Kafr El Sheikh',
    cityName: 'Kafr El Sheikh',
    shippingCost: 65,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 339, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 267, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 173, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 173, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-damietta',
    governorate: 'Damietta',
    cityName: 'Damietta',
    shippingCost: 65,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 339, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 267, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 173, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 173, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-monufia',
    governorate: 'Monufia',
    cityName: 'Monufia',
    shippingCost: 60,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 339, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 267, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 173, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 173, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-qalyubia',
    governorate: 'Qalyubia',
    cityName: 'Qalyubia',
    shippingCost: 55,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 339, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 267, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 173, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 173, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-beni-suef',
    governorate: 'Beni Suef',
    cityName: 'Beni Suef',
    shippingCost: 70,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 420, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 330, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 200, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 200, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-fayoum',
    governorate: 'Fayoum',
    cityName: 'Fayoum',
    shippingCost: 70,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 420, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 330, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 200, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 200, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-minya',
    governorate: 'Minya',
    cityName: 'Minya',
    shippingCost: 75,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 420, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 330, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 200, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 200, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-asyut',
    governorate: 'Asyut',
    cityName: 'Asyut',
    shippingCost: 80,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 420, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 330, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 200, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 200, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-qena',
    governorate: 'Qena',
    cityName: 'Qena',
    shippingCost: 85,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 420, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 330, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 200, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 200, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-luxor',
    governorate: 'Luxor',
    cityName: 'Luxor',
    shippingCost: 85,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 420, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 330, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 200, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 200, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-aswan',
    governorate: 'Aswan',
    cityName: 'Aswan',
    shippingCost: 90,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 420, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 330, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 200, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 200, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-red-sea',
    governorate: 'Red Sea',
    cityName: 'Red Sea',
    shippingCost: 95,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 420, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 330, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 200, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 200, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-sohag',
    governorate: 'Sohag',
    cityName: 'Sohag',
    shippingCost: 80,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 420, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 330, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 200, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 200, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-matrouh',
    governorate: 'Matrouh',
    cityName: 'Matrouh',
    shippingCost: 100,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 474, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 372, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 218, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 218, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-new-valley',
    governorate: 'New Valley',
    cityName: 'New Valley',
    shippingCost: 100,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 474, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 372, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 218, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 218, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-north-sinai',
    governorate: 'North Sinai',
    cityName: 'North Sinai',
    shippingCost: 100,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 474, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 372, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 218, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 218, codFee: 30, isActive: true },
    },
  },
  {
    _id: 'city-south-sinai',
    governorate: 'South Sinai',
    cityName: 'South Sinai',
    shippingCost: 100,
    codFee: 0,
    isActive: true,
    productPricing: {
      [P1]: { price: 4999, shippingCost: 474, codFee: 50, isActive: true },
      [P2]: { price: 3550, shippingCost: 372, codFee: 50, isActive: true },
      [P3]: { price: 1580, shippingCost: 218, codFee: 30, isActive: true },
      [P4]: { price: 1599, shippingCost: 218, codFee: 30, isActive: true },
    },
  },
];

/**
 * Resolves any product ID (MongoDB ID, static ID, or slug) to a static product ID.
 * This ensures checkout works regardless of what's stored in the user's cart.
 */
export function resolveProductId(cartItemId: string): string | null {
  // Direct match — static-product-1 etc
  const direct = STATIC_PRODUCTS.find(p => p._id === cartItemId);
  if (direct) return direct._id!;

  // Slug match — wall-mounted-pull-up-bar etc
  const bySlug = STATIC_PRODUCTS.find(p => nameToSlug(p.name) === cartItemId);
  if (bySlug) return bySlug._id!;

  // MongoDB ObjectId — match by name similarity is impossible,
  // so we return null and checkout falls back gracefully
  return null;
}

/**
 * Gets product-specific pricing for a cart item from a static city,
 * trying all possible ID formats.
 */
export function getProductPricing(
  city: StaticCity,
  cartItemId: string
): StaticCity['productPricing'][string] | null {
  // Try direct ID first
  if (city.productPricing[cartItemId]) {
    return city.productPricing[cartItemId];
  }

  // Try resolving to static ID
  const staticId = resolveProductId(cartItemId);
  if (staticId && city.productPricing[staticId]) {
    return city.productPricing[staticId];
  }

  // Last resort — if only one product in cart and only one pricing entry,
  // use the first available pricing (handles single-product stores)
  const pricingValues = Object.values(city.productPricing);
  if (pricingValues.length === 1) {
    return pricingValues[0];
  }

  return null;
}
