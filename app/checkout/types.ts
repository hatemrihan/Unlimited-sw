export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: {
    name: string;
    size?: string;
    color?: string;
  };
}

export interface City {
  _id: string;
  cityName: string;
  governorate: string;
  shippingCost: number;
  codFee: number;
  isActive: boolean;
  productPricing?: Record<string, { shippingCost: number; codFee: number; isActive: boolean }>;
}

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  apartment: string;
  city: string; // The selected cityName
  notes: string;
  promoCode: string;
  paymentMethod: 'cashOnDelivery' | 'instaPay';
  transactionScreenshot: string | null; // Storing URL directly after fast upload
}

export interface PromoData {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discount: number;
  waiveShipping?: boolean;
  description?: string;
}
