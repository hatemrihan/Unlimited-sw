import dbConnect from '../lib/mongodb';
import Product from '../models/product';
import { validatePromo } from './promoService';
import { resolveVariantName } from './orderCreationService';

/**
 * Server-side authority for order money.
 *
 * Every monetary field used to come straight off the request body — price,
 * subtotal, shippingCost, codFee, totalAmount — so a crafted POST could buy
 * anything for 1 EGP. The client-side "price refresh" is a display convenience,
 * not a control.
 *
 * This module recomputes all of it from MongoDB and mirrors the client's
 * arithmetic in app/checkout/hooks/useCheckoutPricing.ts exactly, so a
 * legitimate order never disagrees with the server and every disagreement is
 * real signal.
 */

/** Tolerance in EGP for float/rounding drift before a mismatch is treated as real. */
const PRICE_TOLERANCE = 1;

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(String(id));
}

/** The storefront only uses a variant's price when it is a positive number. */
function unitPriceFor(product: any, variantName?: string): number {
  if (variantName && Array.isArray(product.variants)) {
    const variant = product.variants.find((v: any) => v.name === variantName);
    if (variant && typeof variant.price === 'number' && variant.price > 0) {
      return variant.price;
    }
  }
  return Number(product.price) || 0;
}

/** Per-product, per-governorate shipping and COD, straight from the product document. */
function cityPricingFor(product: any, governorate?: string) {
  if (!governorate || !Array.isArray(product.cityPricing)) return null;
  const wanted = governorate.trim().toLowerCase();
  const entry = product.cityPricing.find(
    (cp: any) => (cp.governorate || '').trim().toLowerCase() === wanted
  );
  if (!entry || entry.isActive === false) return null;
  return { shippingCost: Number(entry.shippingCost) || 0, codFee: Number(entry.codFee) || 0 };
}

export interface ServerPricing {
  lines: Array<{ productId: string; variantName?: string; quantity: number; price: number; lineTotal: number }>;
  subtotal: number;
  shippingCost: number;
  codFee: number;
  discountAmount: number;
  totalAmount: number;
  promoCode?: string;
  waiveShipping: boolean;
}

export interface PricingResult {
  success: boolean;
  pricing?: ServerPricing;
  error?: string;
  /** True when the client's numbers disagree with the server's beyond tolerance. */
  mismatch?: boolean;
}

/**
 * Recomputes the entire money side of an order from the database.
 * The returned numbers are the only ones that should ever be persisted.
 */
export async function computeOrderPricing(orderData: any): Promise<PricingResult> {
  await dbConnect();

  const governorate: string | undefined =
    orderData?.customer?.governorate?.trim() || orderData?.customer?.city?.trim() || undefined;
  const isCashOnDelivery = orderData?.paymentMethod === 'cashOnDelivery';

  const productIds = (orderData.products || [])
    .map((p: any) => p.productId)
    .filter((id: any) => isValidObjectId(id));

  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p: any) => [String(p._id), p]));

  const lines: ServerPricing['lines'] = [];
  let subtotal = 0;
  let shippingCost = 0;
  let codFee = 0;

  for (const item of orderData.products || []) {
    const product = productMap.get(String(item.productId));
    if (!product) {
      return {
        success: false,
        error: `المنتج ${item.name || ''} مش متاح دلوقتي. من فضلك حدّث الصفحة وجرب تاني.`,
      };
    }

    const quantity = Math.max(1, Number(item.quantity) || 1);
    const variantName = resolveVariantName(item);
    const price = unitPriceFor(product, variantName);
    const lineTotal = price * quantity;

    subtotal += lineTotal;

    // Shipping and COD are charged per unit, per product, exactly as the
    // checkout hook displays them.
    const cityPrice = cityPricingFor(product, governorate);
    if (cityPrice) {
      shippingCost += cityPrice.shippingCost * quantity;
      if (isCashOnDelivery) codFee += cityPrice.codFee * quantity;
    }

    lines.push({ productId: String(item.productId), variantName, quantity, price, lineTotal });
  }

  // Re-validate the promo against the server's subtotal, never the client's.
  let discountAmount = 0;
  let waiveShipping = false;
  let appliedPromoCode: string | undefined;

  const rawPromoCode = orderData.promoCode?.trim();
  if (rawPromoCode) {
    const promoResponse = await validatePromo(rawPromoCode, subtotal);
    if (promoResponse.success && promoResponse.promo) {
      discountAmount = Math.round(promoResponse.promo.discount);
      waiveShipping = Boolean(promoResponse.promo.waiveShipping);
      appliedPromoCode = promoResponse.promo.code;
    }
    // An invalid or expired code is silently ignored, matching the existing
    // behaviour — the order still goes through, just at full price.
  }

  if (waiveShipping) shippingCost = 0;

  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const totalAmount = subtotalAfterDiscount + shippingCost + codFee;

  return {
    success: true,
    pricing: {
      lines,
      subtotal,
      shippingCost,
      codFee,
      discountAmount,
      totalAmount,
      promoCode: appliedPromoCode,
      waiveShipping,
    },
  };
}

/**
 * Compares what the browser claimed against what the server computed.
 * Returns the fields that disagree beyond PRICE_TOLERANCE, for logging and for
 * the 409 that tells the customer to refresh rather than silently charging them
 * a different number than the one they saw.
 */
export function findPricingMismatches(orderData: any, pricing: ServerPricing) {
  const claimed = {
    subtotal: Number(orderData.subtotal) || 0,
    shippingCost: Number(orderData.shippingCost) || 0,
    codFee: Number(orderData.codFee) || 0,
    totalAmount: Number(orderData.totalAmount) || 0,
  };

  const computed = {
    subtotal: pricing.subtotal,
    shippingCost: pricing.shippingCost,
    codFee: pricing.codFee,
    totalAmount: pricing.totalAmount,
  };

  return (Object.keys(claimed) as Array<keyof typeof claimed>)
    .filter(field => Math.abs(claimed[field] - computed[field]) > PRICE_TOLERANCE)
    .map(field => ({ field, claimed: claimed[field], computed: computed[field] }));
}
