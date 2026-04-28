import { useState, useEffect, useMemo } from 'react';
import { CartItem, Governorate, PromoData } from '../types';

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
  // Per-product shipping rates. Heavier/larger products cost more to ship.
  // Falls back to the governorate's default rate when no product-specific rate exists.
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
    shouldWaiveShipping,
    applyPromoCode,
  };
}
