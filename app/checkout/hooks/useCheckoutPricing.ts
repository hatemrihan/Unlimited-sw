import { useState, useEffect } from 'react';
import { CartItem, City, PromoData } from '../types';
import { getProductPricing, STATIC_CITIES } from '../../../data/checkout-cities';
import { getStaticActiveProducts } from '../../../data/products';

interface UseCheckoutPricingProps {
  cartItems: CartItem[];
  paymentMethod: string;
  cityName: string;
}

export function useCheckoutPricing({ cartItems, paymentMethod, cityName }: UseCheckoutPricingProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [refreshedPrices, setRefreshedPrices] = useState<Record<string, number>>({});
  const [appliedPromo, setAppliedPromo] = useState<PromoData | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Instantly load cities and refresh product prices from static failover
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      setLoadingCities(false);
      return;
    }

    setCities(STATIC_CITIES as unknown as City[]);

    const staticProducts = getStaticActiveProducts();
    const productMap: Record<string, any> = {};
    
    staticProducts.forEach(p => {
      if (p._id) {
        productMap[p._id.toString()] = p;
      }
    });

    const priceMap: Record<string, number> = {};
    cartItems.forEach(item => {
      const product = productMap[item.id] || productMap[item.id.toString()];
      if (product) {
        const variantKey = item.variant?.name || 'default';
        const priceKey = `${item.id}_${variantKey}`;
        let price = product.price || 0;

        if (item.variant && product.variants && Array.isArray(product.variants)) {
          const matchingVariant = product.variants.find((v: any) => v.name === item.variant?.name);
          if (matchingVariant && matchingVariant.price !== undefined && matchingVariant.price > 0) {
            price = matchingVariant.price;
          }
        }
        priceMap[priceKey] = price;
      }
    });

    setRefreshedPrices(priceMap);
    setLoadingCities(false);
  }, [cartItems]);

  // Calculate Subtotal 
  const refreshedSubtotal = cartItems.reduce((sum, item) => {
    const variantKey = item.variant?.name || 'default';
    const priceKey = `${item.id}_${variantKey}`;
    const currentPrice = refreshedPrices[priceKey] || item.price;
    return sum + (currentPrice * item.quantity);
  }, 0);

  // Calculate Shipping Base 
  const selectedGovernorate = cities.find(city => city.cityName === cityName);
  let shippingCost = 0;
  let codFee = 0;
  let hasProductSpecificRates = false;

  if (selectedGovernorate) {
    let maxProductShippingCost = 0;
    let maxProductCodFee = 0;

    for (const item of cartItems) {
      const productSpecificPricing = getProductPricing(selectedGovernorate as any, item.id);
      
      let currentItemShipping = 0;
      let currentItemCodFee = 0;

      if (productSpecificPricing && productSpecificPricing.isActive !== false) {
        hasProductSpecificRates = true;
        currentItemShipping = productSpecificPricing.shippingCost || 0;
        currentItemCodFee = productSpecificPricing.codFee || 0;
      } else {
        // Fallback to city base rate — never block checkout
        hasProductSpecificRates = true;
        currentItemShipping = selectedGovernorate.shippingCost || 0;
        currentItemCodFee = selectedGovernorate.codFee || 0;
      }

      if (currentItemShipping > maxProductShippingCost) {
        maxProductShippingCost = currentItemShipping;
      }
      if (currentItemCodFee > maxProductCodFee) {
        maxProductCodFee = currentItemCodFee;
      }
    }
    
    shippingCost = maxProductShippingCost;
    codFee = maxProductCodFee;
  }

  const shippingConfigError = null;

  // Final Calculations
  const shouldWaiveShipping = appliedPromo && appliedPromo.waiveShipping;
  const finalCodFee = paymentMethod === 'cashOnDelivery' ? codFee : 0;
  const finalShippingCost = shouldWaiveShipping ? 0 : shippingCost;
  const discountAmount = appliedPromo ? appliedPromo.discountValue : 0;
  const subtotalAfterDiscount = Math.max(0, refreshedSubtotal - discountAmount);
  const totalWithShipping = subtotalAfterDiscount + finalShippingCost + finalCodFee;

  const applyPromoCode = async (code: string) => {
    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
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
    refreshedPrices,
    refreshedSubtotal,
    shippingCost,
    codFee: finalCodFee,
    discountAmount,
    totalWithShipping,
    appliedPromo,
    promoError,
    shouldWaiveShipping,
    applyPromoCode,
  };
}
