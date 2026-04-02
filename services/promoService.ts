import dbConnect from '../lib/mongodb';
import Promo from '../models/promo';

/**
 * Validates a promo code directly against the database logic.
 * Ensures fast internal execution bypassing HTTP wire delays.
 */
export async function validatePromo(code: string, orderTotal: number) {
  if (!code || !code.trim()) {
    return { success: false, error: 'Promo code is required' };
  }

  await dbConnect();

  const promoCode = await Promo.findOne({
    code: code.toUpperCase().trim(),
    isActive: true
  });

  if (!promoCode) {
    return { success: false, error: 'Invalid promo code' };
  }

  // Check if expired
  if (promoCode.expiresAt) {
    const today = new Date();
    const expiryDate = new Date(promoCode.expiresAt);
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    
    if (today > expiryDate) {
      return { success: false, error: 'Promo code has expired' };
    }
  }

  // Check usage limit
  if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
    return { success: false, error: 'Promo code usage limit exceeded' };
  }

  // Check minimum order
  if (promoCode.minimumOrder && orderTotal < promoCode.minimumOrder) {
    return { success: false, error: `Minimum order of L.E ${promoCode.minimumOrder} required` };
  }

  // Calculate discount
  let discount = 0;
  if (promoCode.discountType === 'percentage') {
    discount = (orderTotal * promoCode.discountValue) / 100;
    if (promoCode.maximumDiscount && discount > promoCode.maximumDiscount) {
      discount = promoCode.maximumDiscount;
    }
  } else {
    discount = promoCode.discountValue;
  }

  return {
    success: true,
    promo: {
      code: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      discount: discount,
      description: promoCode.description,
      waiveShipping: promoCode.waiveShipping || false
    }
  };
}

/**
 * Increments the internal Promo count.
 * Safely runs natively against MongoDB without network hops.
 */
export async function incrementPromoUsage(code: string, session?: any) {
  await dbConnect();
  const updatedPromo = await Promo.findOneAndUpdate(
    { 
      code: code.toUpperCase().trim(),
      $or: [
        { usageLimit: { $exists: false } },
        { usageLimit: null },
        { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
      ]
    },
    { $inc: { usedCount: 1 } },
    { session, new: true }
  );

  if (!updatedPromo) {
    throw new Error('Promo usage limit exceeded or invalid concurrently.');
  }

  return updatedPromo;
}
