import { useState, useEffect } from 'react';
import { CartItem, City, PromoData } from '../types';

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

  // Fetch cities and refresh product prices in batch
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      setLoadingCities(false);
      return;
    }

    const fetchCitiesAndPrices = async () => {
      try {
        const productIds = [...new Set(cartItems.map(item => item.id))];
        const productIdsString = productIds.join(',');

        const [citiesResponse, batchResponse] = await Promise.all([
          fetch(`/api/checkout/cities${productIdsString ? `?productIds=${productIdsString}` : ''}`),
          fetch('/api/products/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: productIds })
          })
        ]);

        if (citiesResponse.ok) {
          const citiesData = await citiesResponse.json();
          setCities(citiesData.cities || []);
        }

        if (batchResponse.ok) {
          const batchData = await batchResponse.json();
          const productMap: Record<string, any> = {};
          
          if (batchData.products) {
            batchData.products.forEach((p: any) => {
              productMap[p._id.toString()] = p; // Ensure ID matches string
            });
          }

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
        }
      } catch (error) {
        console.error('Error fetching prices batch:', error);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCitiesAndPrices();
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
    let totalProductShippingCost = 0;
    let totalProductCodFee = 0;

    for (const item of cartItems) {
      const productSpecificPricing = selectedGovernorate.productPricing?.[item.id];
      if (productSpecificPricing && productSpecificPricing.isActive !== false) {
        hasProductSpecificRates = true;
        totalProductShippingCost += (productSpecificPricing.shippingCost || 0) * item.quantity;
        totalProductCodFee += (productSpecificPricing.codFee || 0) * item.quantity;
      }
    }

    if (hasProductSpecificRates) {
      shippingCost = totalProductShippingCost;
      codFee = totalProductCodFee;
    }
  }

  const shippingConfigError = selectedGovernorate && !hasProductSpecificRates
    ? 'Shipping costs not configured for selected products. Please contact support.'
    : null;

  // Final Calculations
  const shouldWaiveShipping = appliedPromo && appliedPromo.waiveShipping;
  const finalCodFee = paymentMethod === 'cashOnDelivery' ? codFee : 0;
  const finalShippingCost = shouldWaiveShipping ? 0 : shippingCost;
  const discountAmount = appliedPromo ? appliedPromo.discount : 0;
  const subtotalAfterDiscount = Math.max(0, refreshedSubtotal - discountAmount);
  const totalWithShipping = subtotalAfterDiscount + finalShippingCost + finalCodFee;

  const applyPromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }
    try {
      // Must use refreshedSubtotal here ! (fixing the bug the user cited)
      const response = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orderTotal: refreshedSubtotal }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAppliedPromo(data.promo);
        setPromoError(null);
      } else {
        setPromoError(data.error || 'Invalid promo code');
        setAppliedPromo(null);
      }
    } catch (error) {
      setPromoError('Failed to validate promo code');
      setAppliedPromo(null);
    }
  };

  return {
    cities,
    loadingCities,
    selectedGovernorate,
    shippingConfigError,
    refreshedPrices,
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
