import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Order from '../../../models/order';
import { validatePromo } from '../../../services/promoService';
import { createOrderTransaction } from '../../../services/orderCreationService';
import { dispatchOrderPostProcessing } from '../../../services/emailQueueService';
import { logger } from '../../../utils/logger';

const MONGO_BYPASS = process.env.MONGO_BYPASS === 'true';

// Ensure Node runtime for Nodemailer
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    if (!MONGO_BYPASS) await dbConnect();

    // Parse request body
    const orderData = await request.json();

    // Validate required fields
    const requiredFields = ['customer', 'products', 'paymentMethod', 'totalAmount', 'subtotal', 'shippingCost'];
    for (const field of requiredFields) {
      const value = orderData[field];
      const hasValue = value !== undefined && value !== null && value !== '';

      if (!hasValue) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`
          },
          { status: 400 }
        );
      }
    }

    // Validate customer data
    if (!orderData.customer) {
      return NextResponse.json(
        { success: false, error: 'Customer information is required' },
        { status: 400 }
      );
    }

    const customerFields = ['name', 'email', 'phone', 'address'];
    for (const field of customerFields) {
      const value = orderData.customer[field];
      const hasValue = value !== undefined && value !== null && value !== '';

      if (!hasValue) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing customer field: ${field}`
          },
          { status: 400 }
        );
      }
    }

    // Validate products
    if (!Array.isArray(orderData.products) || orderData.products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order must contain at least one product'
        },
        { status: 400 }
      );
    }

    // Validate each product
    // Validate each product synchronously over extreme payloads using native maps instead of unbounded iterations
    const requiredProductFields = ['productId', 'name', 'price', 'quantity', 'image'];
    const invalidProductIdx = orderData.products.findIndex((product: any) => 
      requiredProductFields.some(field => product[field] === undefined || product[field] === null || product[field] === '')
    );

    if (invalidProductIdx !== -1) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required core fields for product listing at index ${invalidProductIdx + 1}`
        },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!['cashOnDelivery', 'instaPay'].includes(orderData.paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payment method'
        },
        { status: 400 }
      );
    }

    // If InstaPay is selected, transaction screenshot is required
    if (orderData.paymentMethod === 'instaPay' && !orderData.transactionScreenshot) {
      logger.warn('❌ InstaPay payment requires transaction screenshot');
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction screenshot is required for InstaPay payments'
        },
        { status: 400 }
      );
    }

    // Handle promo code if provided
    let promoDiscount = 0;
    if (!MONGO_BYPASS) {
      if (orderData.promoCode && orderData.promoCode.trim()) {
        try {
          logger.info('🎫 Processing promo code natively:', orderData.promoCode);
          const promoResponse = await validatePromo(orderData.promoCode, orderData.subtotal);

          if (promoResponse.success && promoResponse.promo) {
            promoDiscount = promoResponse.promo.discount;
            // Note constraint: incrementPromoUsage is handled robustly within the createOrderTransaction bounds downstream
          }
        } catch (promoError) {
          // Continue with order creation even if promo fails
          logger.warn('🎫 Promo Engine warning:', promoError);
        }
      }
    }

    // Calculate final amounts
    const subtotalAfterDiscount = Math.max(0, orderData.subtotal - promoDiscount);
    const finalTotal = subtotalAfterDiscount + orderData.shippingCost + (orderData.codFee || 0);

    // Create order object
    const newOrder: any = {
      customer: {
        name: orderData.customer.name?.trim() || '',
        email: orderData.customer.email?.trim() || '',
        phone: orderData.customer.phone?.trim() || '',
        address: orderData.customer.address?.trim() || ''
      },

      products: orderData.products.map((product: unknown) => {
        const prod = product as any; // Type assertion for now
        return {
          productId: prod.productId || '',
          name: prod.name || '',
          price: Number(prod.price) || 0,
          quantity: Number(prod.quantity) || 1,
          size: prod.size || undefined,
          color: prod.color || undefined,
          image: prod.image || ''
        }
      }),
      paymentMethod: orderData.paymentMethod,
      transactionScreenshot: orderData.transactionScreenshot || undefined,
      totalAmount: Number(finalTotal) || 0,
      subtotal: Number(orderData.subtotal) || 0,
      shippingCost: Number(orderData.shippingCost) || 0,
      promoCode: orderData.promoCode?.trim() || undefined,
      discountAmount: promoDiscount || 0,
      codFee: Number(orderData.codFee) || 0,
      status: 'pending',
      notes: orderData.notes?.trim() || undefined,
      orderDate: new Date()


    };



    // Add promo information to notes if applied
    if (promoDiscount > 0) {
      newOrder.notes = `${newOrder.notes || ''}\n\n🎫 Promo Code Applied: ${orderData.promoCode} (Discount: L.E ${promoDiscount})`.trim();
    }

    // 🔥 CRITICAL: Delegate Database Write and Stock Mutation to Service Tier!
    logger.info('🔍 Booting Mongoose Transaction payload...');
    let savedOrder: any;

    if (MONGO_BYPASS) {
      const fallbackId = `ORD-FB-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      savedOrder = {
        ...newOrder,
        orderId: fallbackId,
        _id: fallbackId,
        createdAt: new Date(),
        orderDate: new Date(),
      };
    } else {
      const txResult = await createOrderTransaction(orderData, newOrder, promoDiscount);
      if (!txResult.success) {
        return NextResponse.json(
          { success: false, error: txResult.error || 'Failed to process order. Stock may fall short.' },
          { status: 400 }
        );
      }
      savedOrder = txResult.savedOrder;
    }

    // 📧 Background Post-Processing (Fire and Forget! 0 blocking time)
    logger.info('🚀 Dispatching Background Hooks...');
    if (MONGO_BYPASS) {
      // In bypass mode, await emails directly — serverless kills fire-and-forget too fast
      await dispatchOrderPostProcessing(savedOrder, orderData);
    } else {
      dispatchOrderPostProcessing(savedOrder, orderData);
    }

    // Return success response with order details instantly
    return NextResponse.json({
      success: true,
      order: {
        orderId: savedOrder.orderId,
        customer: savedOrder.customer,
        products: savedOrder.products,
        paymentMethod: savedOrder.paymentMethod,
        transactionScreenshot: savedOrder.transactionScreenshot,
        totalAmount: savedOrder.totalAmount,
        subtotal: savedOrder.subtotal,
        shippingCost: savedOrder.shippingCost,
        status: savedOrder.status,
        notes: savedOrder.notes,
        orderDate: savedOrder.orderDate,
        createdAt: savedOrder.createdAt
      },
      message: 'Order placed successfully!'
    });

  } catch (error: any) {
    // Handle specific MongoDB errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order processing failed due to duplicate order ID. Please try again.'
        },
        { status: 500 }
      );
    }

    // Handle connection errors
    if (error && typeof error === 'object' && 'name' in error &&
      (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection error. Please try again.'
        },
        { status: 500 }
      );
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      // Provide more specific error messages
      const mongoError = error as any; // Type assertion for MongoDB error
      const validationErrors = Object.values(mongoError.errors).map((err: any) => err.message);
      return NextResponse.json(
        {
          success: false,
          error: `Validation failed: ${validationErrors.join(', ')}`
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process order. Please try again.'
      },
      { status: 500 }
    );
  }
}

// GET - Fetch orders for admin (optional, for admin dashboard)
export async function GET(request: NextRequest) {
  if (process.env.MONGO_BYPASS === 'true') {
    return NextResponse.json({
      success: true,
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
      orders: [],
      _notice: 'Database is currently in maintenance mode.'
    });
  }

  try {
    await dbConnect();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50'); // 50 items per page default
    const skip = (page - 1) * limit;

    const totalCount = await Order.countDocuments({});
    
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      orders: orders.map(order => ({
        _id: order._id, // IMPORTANT: Include _id for delete/update operations!
        orderId: order.orderId,
        customer: order.customer,
        products: order.products,
        paymentMethod: order.paymentMethod,
        promoCode: order.promoCode,
        discountAmount: order.discountAmount,
        transactionScreenshot: order.transactionScreenshot,
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        status: order.status,
        orderDate: order.orderDate,
        createdAt: order.createdAt,
        notes: order.notes
      }))
    });

  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders'
      },
      { status: 500 }
    );
  }
}
