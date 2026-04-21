import { useState, useEffect, useRef, useMemo } from 'react';
import { CartItem, City, PromoData } from '../types';

interface UseCheckoutPricingProps {
  cartItems: CartItem[];
  paymentMethod: string;
  cityName: string;
}

/**
 * Resolves the effective price for a cart item based on governorate-specific overrides.
 * Falls back to the base cart price when no custom pricing exists.
 */
function resolveItemPrice(item: CartItem, governorate?: City): number {
  const specific = governorate?.productPricing?.[item.id];
  return (specific?.price && specific.price > 0) ? specific.price : item.price;
}

export function useCheckoutPricing({ cartItems, paymentMethod, cityName }: UseCheckoutPricingProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [appliedPromo, setAppliedPromo] = useState<PromoData | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Stable dependency key — only re-fetch when the set of product IDs actually changes
  const productIdsKey = useMemo(
    () => [...new Set(cartItems.map(item => item.id))].sort().join(','),
    [cartItems]
  );

  // Fetch cities with product-specific pricing from MongoDB
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      setLoadingCities(false);
      return;
    }

    const fetchCitiesAndPrices = async () => {
      try {
        const queryParam = productIdsKey ? `?productIds=${productIdsKey}` : '';
        const citiesResponse = await fetch(`/api/checkout/cities${queryParam}`, {
          cache: 'no-store'
        });
        
        if (citiesResponse.ok) {
          const citiesData = await citiesResponse.json();
          setCities(citiesData.cities || []);
        }
      } catch (error) {
        console.error('Error fetching dynamic checkout data:', error);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCitiesAndPrices();
  }, [productIdsKey]);

  // Resolve selected governorate from fetched cities
  const selectedGovernorate = cities.find(city => city.cityName === cityName);
  
  // ── Shipping & COD ─────────────────────────────────────────────────────
  // Accumulates per-item × quantity. Each item uses its product-specific
  // override if available, otherwise falls back to the base governorate rate.
  let shippingCost = 0;
  let codFee = 0;
  
  if (selectedGovernorate) {
    const baseShipping = selectedGovernorate.shippingCost || 0;
    const baseCod = selectedGovernorate.codFee || 0;
    
    cartItems.forEach(item => {
      const productSpecifics = selectedGovernorate.productPricing?.[item.id];
      const itemShipping = (productSpecifics?.shippingCost != null && productSpecifics.shippingCost > 0)
        ? productSpecifics.shippingCost
        : baseShipping;
      const itemCod = (productSpecifics?.codFee != null && productSpecifics.codFee > 0)
        ? productSpecifics.codFee
        : baseCod;
      
      shippingCost += itemShipping * item.quantity;
      codFee += itemCod * item.quantity;
    });
  }

  // ── Subtotal ───────────────────────────────────────────────────────────
  const refreshedSubtotal = cartItems.reduce(
    (sum, item) => sum + resolveItemPrice(item, selectedGovernorate) * item.quantity,
    0
  );

  // ── Dynamic Price Map (for UI display per line item) ───────────────────
  const dynamicPrices: Record<string, number> = {};
  cartItems.forEach(item => {
    const priceKey = `${item.id}_${item.variant?.name || 'default'}`;
    dynamicPrices[priceKey] = resolveItemPrice(item, selectedGovernorate);
  });

  // ── Shipping Config Error ──────────────────────────────────────────────
  const shippingConfigError = cityName && !selectedGovernorate
    ? 'Shipping costs not configured for selected products in your region.'
    : null;

  // ── Discount ───────────────────────────────────────────────────────────
  // Correctly handles both percentage and fixed discount types
  const discountAmount = appliedPromo
    ? appliedPromo.discountType === 'percentage'
      ? Math.round((refreshedSubtotal * appliedPromo.discountValue) / 100)
      : appliedPromo.discountValue
    : 0;

  // ── Final Totals ───────────────────────────────────────────────────────
  const shouldWaiveShipping = appliedPromo && appliedPromo.waiveShipping;
  const finalCodFee = paymentMethod === 'cashOnDelivery' ? codFee : 0;
  const finalShippingCost = shouldWaiveShipping ? 0 : shippingCost;
  const subtotalAfterDiscount = Math.max(0, refreshedSubtotal - discountAmount);
  const totalWithShipping = subtotalAfterDiscount + finalShippingCost + finalCodFee;

  // ── Promo Code ─────────────────────────────────────────────────────────
  const applyPromoCode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setPromoError('Please enter a promo code');
      return;
    }

    // Guard: don't re-validate the same code
    if (appliedPromo?.code?.toLowerCase() === trimmed.toLowerCase()) {
      return;
    }
    
    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed })
      });
      const data = await response.json();
      
      if (data.success && data.promo) {
        setAppliedPromo({
          code: data.promo.code,
          discountType: data.promo.discountType || 'fixed',
          discountValue: data.promo.discountValue,
          waiveShipping: data.promo.waiveShipping || false
        });
        setPromoError(null);
      } else {
        setAppliedPromo(null);
        setPromoError(data.message || 'Invalid promo code');
      }
    } catch (err) {
      setAppliedPromo(null);
      setPromoError('Failed to validate promo code');
    }
  };

  return {
    cities,
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
    shouldWaiveShipping,
    applyPromoCode,
  };
}
