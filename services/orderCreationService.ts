import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import Order, { IOrder } from '../models/order';
import Product from '../models/product';

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
        if (orderProduct.variant?.name) {
          // Atomic variant decrement with exact structural conditions
          const updateResult = await Product.findOneAndUpdate(
            {
              _id: orderProduct.productId,
              'variants.name': orderProduct.variant.name,
              'variants.stock': { $gte: orderProduct.quantity }
            },
            {
              $inc: { 'variants.$.stock': -orderProduct.quantity }
            },
            { new: true, session }
          );

          if (!updateResult) {
            throw new Error(`Insufficient stock or invalid variant constraint for ${orderProduct.name} (${orderProduct.variant.name}).`);
          }
        } else {
          // Atomic main stock decrement
          const updateResult = await Product.findOneAndUpdate(
            { 
              _id: orderProduct.productId, 
              stock: { $gte: orderProduct.quantity } 
            },
            { 
              $inc: { stock: -orderProduct.quantity } 
            },
            { new: true, session }
          );

          if (!updateResult) {
            throw new Error(`Insufficient baseline stock limits for ${orderProduct.name} due to concurrent order reservations.`);
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
    console.error('❌ Mongoose Transaction aborted gracefully:', error.message);
    return { success: false, error: error.message };
  } finally {
    await session.endSession();
  }
}
