import { CartItem } from '../../contexts/CartContext';

export interface GovernorateShipping {
  shippingCost: number;
  codFee: number;
  isActive: boolean;
}

export interface Governorate {
  _id: string;
  governorate: string;
  shippingCost: number;
  codFee: number;
  isActive: boolean;
  /** Per-product shipping/COD overrides (keyed by product MongoDB _id) */
  productPricing?: Record<string, GovernorateShipping>;
}

/** @deprecated Use Governorate instead */
export type City = Governorate;

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  apartment: string;
  city: string; // The selected governorate name
  notes: string;
  promoCode: string;
  paymentMethod: 'cashOnDelivery' | 'instaPay';
  transactionScreenshot: string | null;
}

export interface PromoData {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  waiveShipping?: boolean;
  description?: string;
}

export type { CartItem };
