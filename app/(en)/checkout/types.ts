import { CartItem } from '@/contexts/CartContext';

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
  /**
   * What this code takes off THIS order, in EGP, as calculated by the server.
   *
   * Not derivable from `discountValue` on the client: a percentage code may
   * carry a `maximumDiscount` cap, which only the server knows about. Recomputing
   * it here is what produced 409 PRICING_MISMATCH at submit.
   */
  discount: number;
  waiveShipping?: boolean;
  description?: string;
}

export type { CartItem };
