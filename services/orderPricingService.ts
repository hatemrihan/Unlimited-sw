import dbConnect from '../lib/mongodb';
import { productQueries } from '@/product/queries';
import { validatePromo } from './promoService';
import { resolveVariantName } from './orderCreationService';
import { getFreeShippingStatus, isProductShippingWaived } from '../lib/freeShippingCheck';

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
  /**
   * Why the submitted promo code was not applied, if one was submitted and
   * rejected. Carried so the customer can be told the real reason — see the
   * note in `computeOrderPricing`.
   */
  promoError?: string;
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

  // Through the seam, and deliberately NOT through a cached read: this is the
  // query that decides what the customer is charged, and it must see the
  // database as it is right now, not as it was up to 45 seconds ago.
  const products = await productQueries.findByIds(productIds);
  const productMap = new Map(products.map((p: any) => [String(p._id), p]));

  const lines: ServerPricing['lines'] = [];
  let subtotal = 0;
  let shippingCost = 0;
  let codFee = 0;

  // ── Global free-shipping override ────────────────────────────────────
  // Read status once (cached in memory) before processing item lines.
  let freeShippingStatus = { active: false, applyToAll: true, productIds: [] as string[] };
  try {
    const fs = await getFreeShippingStatus();
    if (fs.active) {
      freeShippingStatus = fs;
    }
  } catch (err) {
    console.error('[OrderPricing] Failed to fetch free-shipping status:', err);
  }

  for (const item of orderData.products || []) {
    const product = productMap.get(String(item.productId));
    if (!product) {
      return {
        success: false,
        error: `${item.name || 'That item'} is not available right now. Please refresh the page and try again.`,
      };
    }

    const quantity = Math.max(1, Number(item.quantity) || 1);
    const variantName = resolveVariantName(item);
    const price = unitPriceFor(product, variantName);
    const lineTotal = price * quantity;

    subtotal += lineTotal;

    // Shipping is charged per unit, per product.
    // If the override is active and waives this product, shipping is 0 for this item.
    // COD fee is always charged normally when payment method is Cash on Delivery.
    const cityPrice = cityPricingFor(product, governorate);
    if (cityPrice) {
      const isWaived = freeShippingStatus.active && isProductShippingWaived(freeShippingStatus, String(item.productId));
      if (!isWaived) {
        shippingCost += cityPrice.shippingCost * quantity;
      }
      if (isCashOnDelivery) {
        codFee += cityPrice.codFee * quantity;
      }
    }

    lines.push({ productId: String(item.productId), variantName, quantity, price, lineTotal });
  }

  // Re-validate the promo against the server's subtotal, never the client's.
  let discountAmount = 0;
  let waiveShipping = false;
  let appliedPromoCode: string | undefined;

  let promoError: string | undefined;

  const rawPromoCode = orderData.promoCode?.trim();
  if (rawPromoCode) {
    const promoResponse = await validatePromo(rawPromoCode, subtotal);
    if (promoResponse.success && promoResponse.promo) {
      discountAmount = Math.round(promoResponse.promo.discount);
      waiveShipping = Boolean(promoResponse.promo.waiveShipping);
      appliedPromoCode = promoResponse.promo.code;
    } else {
      // An invalid or expired code is still not fatal — the order goes through
      // at full price. But the reason is now KEPT rather than discarded.
      //
      // Discarding it produced a genuinely misleading message: the total then
      // disagreed with the browser's, which tripped the pricing-mismatch check,
      // and the customer was told "the prices changed" when the truth was
      // "your promo code expired". They would refresh, see the same total, and
      // have no idea what was wrong.
      promoError = promoResponse.error;
    }
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
      promoError,
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
