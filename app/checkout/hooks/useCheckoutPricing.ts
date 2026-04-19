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

  // Fetch cities and refresh product prices from checkout APIs
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      setLoadingCities(false);
      return;
    }

    const fetchCitiesAndPrices = async () => {
      try {
        const productIds = [...new Set(cartItems.map(item => item.id))];
        const productIdsString = productIds.join(',');

        // Execute dynamic API call to MongoDB to resolve product-specific shipping matrices
        // Force no-store to ensure we get the latest edited prices from admin
        const citiesResponse = await fetch(`/api/checkout/cities${productIdsString ? `?productIds=${productIdsString}` : ''}`, {
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
  }, [cartItems]);

  // Calculate dynamic component pricing and override static cart prices based on the selected governorate
  const selectedGovernorate = cities.find(city => city.cityName === cityName);
  
  let shippingCost = 0;
  let codFee = 0;
  
  if (selectedGovernorate) {
    const baseShipping = selectedGovernorate.shippingCost || 0;
    const baseCod = selectedGovernorate.codFee || 0;
    
    // Accumulate shipping and COD fees per item × quantity
    // Each item uses its product-specific override if available, otherwise the base governorate rate
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

  // Calculate Subtotal with live governorate pricing
  const refreshedSubtotal = cartItems.reduce((sum, item) => {
    // Determine dynamic price
    let currentPrice = item.price; // fallback to cart base price
    
    // Check if the selected governorate has a custom price for this specific product
    if (selectedGovernorate?.productPricing?.[item.id]) {
      const specificPrice = selectedGovernorate.productPricing[item.id].price;
      if (specificPrice > 0) {
        currentPrice = specificPrice;
      }
    }
    
    return sum + (currentPrice * item.quantity);
  }, 0);

  // Expose the dynamically overridden prices so the UI can display them correctly per item
  const dynamicPrices: Record<string, number> = {};
  cartItems.forEach(item => {
    const variantKey = item.variant?.name || 'default';
    const priceKey = `${item.id}_${variantKey}`;
    
    let currentPrice = item.price;
    if (selectedGovernorate?.productPricing?.[item.id]) {
        const specificPrice = selectedGovernorate.productPricing[item.id].price;
        if (specificPrice > 0) {
          currentPrice = specificPrice;
        }
    }
    dynamicPrices[priceKey] = currentPrice;
  });

  const shippingConfigError = cityName && !selectedGovernorate
    ? 'Shipping costs not configured for selected products in your region.'
    : null;

  // Final Calculations
  const shouldWaiveShipping = appliedPromo && appliedPromo.waiveShipping;
  const finalCodFee = paymentMethod === 'cashOnDelivery' ? codFee : 0;
  const finalShippingCost = shouldWaiveShipping ? 0 : shippingCost;
  const discountAmount = appliedPromo ? appliedPromo.discountValue : 0;
  const subtotalAfterDiscount = Math.max(0, refreshedSubtotal - discountAmount);
  const totalWithShipping = subtotalAfterDiscount + finalShippingCost + finalCodFee;

  const applyPromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }
    
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
