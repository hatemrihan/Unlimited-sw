import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import Order, { IOrder } from '../models/order';
import Product from '../models/product';

/**
 * Validates whether a string is a valid MongoDB ObjectId (24-char hex).
 * Used to guard against legacy static IDs like "static-product-1" that
 * would crash Mongoose queries expecting real ObjectIds.
 */
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Executes the Order creation and Stock decrement completely inside a unified
 * database Transaction boundaries guaranteeing all-or-nothing execution without
 * manual rollback drift.
 */
export async function createOrderTransaction(orderData: any, newOrder: Partial<IOrder>, promoDiscount: number) {
  await dbConnect();

  // Establish standard session wrapper preventing manual drift
  const session = await mongoose.startSession();
  
  try {
    let savedOrder: any;
    
    // Mount the operation sequence natively via withTransaction protecting concurrent threads
    await session.withTransaction(async () => {
      // 1. Validate and deduct stock for each product structurally locked inside the session
      for (const orderProduct of orderData.products) {
        const productId = orderProduct.productId;

        // 🛡️ GUARD: Skip stock decrement for non-MongoDB IDs (legacy static fallback products)
        // These IDs (e.g. "static-product-1") don't exist in the database, so querying
        // them would crash with "Cast to ObjectId failed". The order still completes —
        // we just can't track stock for products that aren't in MongoDB.
        if (!isValidObjectId(productId)) {
          console.warn(`⚠️ [OrderService] Skipping stock decrement for legacy/static product ID: "${productId}" (${orderProduct.name}). This item is not in MongoDB.`);
          continue;
        }

        if (orderProduct.variant?.name) {
          // Atomic variant decrement with exact structural conditions
          const updateResult = await Product.findOneAndUpdate(
            {
              _id: productId,
              'variants.name': orderProduct.variant.name,
              'variants.stock': { $gte: orderProduct.quantity }
            },
            {
              $inc: { 'variants.$.stock': -orderProduct.quantity }
            },
            { new: true, session }
          );

          if (!updateResult) {
            throw new Error(`للأسف الكمية المطلوبة من ${orderProduct.name} (${orderProduct.variant.name}) مش متوفرة دلوقتي. حد تاني طلبها قبلك بثواني!`);
          }
        } else {
          // Atomic main stock decrement
          const updateResult = await Product.findOneAndUpdate(
            { 
              _id: productId, 
              stock: { $gte: orderProduct.quantity } 
            },
            { 
              $inc: { stock: -orderProduct.quantity } 
            },
            { new: true, session }
          );

          if (!updateResult) {
            throw new Error(`للأسف ${orderProduct.name} خلصت من الستوك! حد تاني طلبها قبلك بثواني. جرب تاني بعدين أو تواصل معانا.`);
          }
        }
      }

      // 2. Commit Order Payload identically across the session
      const [order] = await Order.create([newOrder], { session });
      savedOrder = order;

      // 3. Complete internal native hooks safely without wire delays
      if (promoDiscount > 0 && orderData.promoCode) {
        const Promo = (await import('../models/promo')).default;
        await Promo.findOneAndUpdate(
          { code: orderData.promoCode.toUpperCase().trim() },
          { $inc: { usedCount: 1 } },
          { session }
        );
      }
    });

    return { success: true, savedOrder };
  } catch (error: any) {
    console.error('❌ الأوردر اتلغى بسبب مشكلة في الستوك:', error.message);
    return { success: false, error: error.message };
  } finally {
    await session.endSession();
  }
}
