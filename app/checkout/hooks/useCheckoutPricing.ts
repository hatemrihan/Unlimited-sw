import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CartItem, Governorate, PromoData } from '../types';

/** What `/api/promo/validate` sends back when a code is accepted. */
interface PromoResponse {
  code: string;
  discountType?: 'percentage' | 'fixed';
  discountValue: number;
  discount: number;
  waiveShipping?: boolean;
  description?: string;
}

/**
 * Asks the server whether a code may be used on an order of `orderTotal`.
 *
 * `orderTotal` is not optional: the endpoint returns 400 without it, which is
 * what made every code at checkout come back "Invalid promo code".
 */
async function requestPromoValidation(code: string, orderTotal: number) {
  const response = await fetch('/api/promo/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, orderTotal })
  });
  return (await response.json()) as
    | { success: true; promo: PromoResponse }
    | { success: false; error?: string };
}

/** Keeps the server's discount as-is; the client never recalculates it. */
function toPromoData(promo: PromoResponse): PromoData {
  return {
    code: promo.code,
    discountType: promo.discountType || 'fixed',
    discountValue: promo.discountValue,
    discount: promo.discount,
    waiveShipping: promo.waiveShipping || false
  };
}

interface UseCheckoutPricingProps {
  cartItems: CartItem[];
  paymentMethod: string;
  cityName: string;
}

export function useCheckoutPricing({ cartItems, paymentMethod, cityName }: UseCheckoutPricingProps) {
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [appliedPromo, setAppliedPromo] = useState<PromoData | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [freeShippingActive, setFreeShippingActive] = useState<boolean>(false);

  /**
   * The subtotal the applied code was last checked against.
   *
   * A percentage code is worth a different amount on a different subtotal, so
   * if the cart changes underneath an applied code the stored discount is
   * stale. This is what tells the re-validation effect whether it has work to
   * do, and stops it re-asking the server after every render.
   */
  const validatedSubtotalRef = useRef<number | null>(null);

  // Stable dependency key — only re-fetch when the set of product IDs changes
  const productIdsKey = useMemo(
    () => [...new Set(cartItems.map(item => item.id))].sort().join(','),
    [cartItems]
  );

  // Fetch governorates with per-product shipping/COD from MongoDB
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      setLoadingCities(false);
      return;
    }

    const fetchGovernorates = async () => {
      try {
        const queryParam = productIdsKey ? `?productIds=${productIdsKey}` : '';
        const response = await fetch(`/api/checkout/cities${queryParam}`, {
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          setGovernorates(data.cities || []);
          if (typeof data.freeShippingActive === 'boolean') {
            setFreeShippingActive(data.freeShippingActive);
          }
        }
      } catch (error) {
        console.error('Error fetching governorates:', error);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchGovernorates();
  }, [productIdsKey]);

  // Find selected governorate
  const selectedGovernorate = governorates.find(g => g.governorate === cityName);
  
  // ── Shipping & COD ─────────────────────────────────────────────────────
  // ONLY use product-level city pricing (from each product's cityPricing array).
  // NEVER fall back to global CityPricing settings — those are admin defaults
  // and should NOT override what's configured per product.
  let shippingCost = 0;
  let codFee = 0;
  
  if (selectedGovernorate) {
    cartItems.forEach(item => {
      const productSpecifics = selectedGovernorate.productPricing?.[item.id];
      // Only charge what the product's own city pricing says
      const itemShipping = productSpecifics?.shippingCost ?? 0;
      const itemCod = productSpecifics?.codFee ?? 0;
      
      shippingCost += itemShipping * item.quantity;
      codFee += itemCod * item.quantity;
    });
  }

  // ── Subtotal ───────────────────────────────────────────────────────────
  // Product price comes from item.price (refreshed from MongoDB via CartContext)
  const refreshedSubtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // ── Dynamic Price Map (for UI display per line item) ───────────────────
  const dynamicPrices: Record<string, number> = {};
  cartItems.forEach(item => {
    const priceKey = `${item.id}_${item.variant?.name || 'default'}`;
    dynamicPrices[priceKey] = item.price;
  });

  // ── Shipping Config Error ──────────────────────────────────────────────
  const shippingConfigError = cityName && !selectedGovernorate
    ? 'Shipping not configured for your governorate.'
    : null;

  // ── Discount ───────────────────────────────────────────────────────────
  // The server's figure, rounded the same way orderPricingService rounds it, so
  // the two sides cannot disagree and trip the 409 at submit.
  const discountAmount = appliedPromo ? Math.round(appliedPromo.discount) : 0;

  // ── Final Totals ───────────────────────────────────────────────────────
  const shouldWaiveShipping = appliedPromo && appliedPromo.waiveShipping;
  const finalCodFee = paymentMethod === 'cashOnDelivery' ? codFee : 0;
  const finalShippingCost = shouldWaiveShipping ? 0 : shippingCost;
  const subtotalAfterDiscount = Math.max(0, refreshedSubtotal - discountAmount);
  const totalWithShipping = subtotalAfterDiscount + finalShippingCost + finalCodFee;

  // ── Promo Code ─────────────────────────────────────────────────────────
  const applyPromoCode = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setPromoError('Please enter a promo code');
      return;
    }

    if (appliedPromo?.code?.toLowerCase() === trimmed.toLowerCase()) {
      return;
    }

    try {
      const data = await requestPromoValidation(trimmed, refreshedSubtotal);

      if (data.success) {
        validatedSubtotalRef.current = refreshedSubtotal;
        setAppliedPromo(toPromoData(data.promo));
        setPromoError(null);
      } else {
        validatedSubtotalRef.current = null;
        setAppliedPromo(null);
        // The route answers with `error`, not `message`.
        setPromoError(data.error || 'Invalid promo code');
      }
    } catch {
      validatedSubtotalRef.current = null;
      setAppliedPromo(null);
      setPromoError('Failed to validate promo code');
    }
  }, [appliedPromo?.code, refreshedSubtotal]);

  /**
   * Re-checks an applied code whenever the subtotal it was priced against
   * changes — a line removed, a quantity changed, a price refreshed.
   *
   * Without this the customer keeps a discount calculated for a cart they no
   * longer have; the server would re-price at submit and refuse the order with
   * a 409 they cannot act on. Here they see it change, or see why it no longer
   * applies, while they can still do something about it.
   */
  useEffect(() => {
    const code = appliedPromo?.code;
    if (!code) return;
    if (validatedSubtotalRef.current === refreshedSubtotal) return;

    let abandoned = false;

    const revalidateAppliedPromo = async () => {
      try {
        const data = await requestPromoValidation(code, refreshedSubtotal);
        if (abandoned) return;

        if (data.success) {
          validatedSubtotalRef.current = refreshedSubtotal;
          setAppliedPromo(toPromoData(data.promo));
          setPromoError(null);
        } else {
          validatedSubtotalRef.current = null;
          setAppliedPromo(null);
          setPromoError(data.error || 'Promo code no longer applies to this order');
        }
      } catch {
        // Network trouble is not proof the code is bad. Leave it applied; the
        // server re-prices at submit and is the authority either way.
      }
    };

    revalidateAppliedPromo();

    return () => {
      abandoned = true;
    };
  }, [appliedPromo?.code, refreshedSubtotal]);

  return {
    cities: governorates,         // backward-compatible alias
    governorates,
    loadingCities,
    selectedGovernorate,
    shippingConfigError,
    refreshedPrices: dynamicPrices,
    refreshedSubtotal,
    shippingCost: finalShippingCost,
    codFee: finalCodFee,
    discountAmount,
    totalWithShipping,
    appliedPromo,
    promoError,
    shouldWaiveShipping: Boolean(shouldWaiveShipping || (freeShippingActive && finalShippingCost === 0 && selectedGovernorate)),
    freeShippingActive,
    applyPromoCode,
  };
}
