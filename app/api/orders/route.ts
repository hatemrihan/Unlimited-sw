import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Order, { IOrder } from '../../../models/order';
import { sendOrderConfirmationEmail, sendAdminNotificationEmail } from '../../../lib/email';

// Ensure Node runtime for Nodemailer
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();

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
    for (let i = 0; i < orderData.products.length; i++) {
      const product = orderData.products[i];

      const requiredProductFields = ['productId', 'name', 'price', 'quantity', 'image'];
      for (const field of requiredProductFields) {
        const value = product[field];
        const hasValue = value !== undefined && value !== null && value !== '';

        if (!hasValue) {
          return NextResponse.json(
            {
              success: false,
              error: `Missing ${field} for product ${i + 1}`
            },
            { status: 400 }
          );
        }
      }
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
      console.error('❌ InstaPay payment requires transaction screenshot');
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
    if (orderData.promoCode && orderData.promoCode.trim()) {
      try {
        console.log('🎫 Processing promo code:', orderData.promoCode);
        const promoResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/promo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: orderData.promoCode,
            orderTotal: orderData.subtotal
          }),
        });

        if (promoResponse.ok) {
          const promoData = await promoResponse.json();
          if (promoData.success) {
            promoDiscount = promoData.promo.discount;

            // Update promo usage count
            const Promo = (await import('../../../models/promo')).default;
            await Promo.findOneAndUpdate(
              { code: orderData.promoCode.toUpperCase().trim() },
              { $inc: { usedCount: 1 } }
            );
          }
        }
      } catch (promoError) {
        // Continue with order creation even if promo fails
      }
    }

    // Calculate final amounts
    const subtotalAfterDiscount = Math.max(0, orderData.subtotal - promoDiscount);
    const finalTotal = subtotalAfterDiscount + orderData.shippingCost;

    // Create order object
    const newOrder: Partial<IOrder> = {
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
      }}),
      paymentMethod: orderData.paymentMethod,
      transactionScreenshot: orderData.transactionScreenshot || undefined,
      totalAmount: Number(finalTotal) || 0,
      subtotal: Number(orderData.subtotal) || 0,
      shippingCost: Number(orderData.shippingCost) || 0,
      status: 'pending',
      notes: orderData.notes?.trim() || undefined,
      orderDate: new Date()
    };



    // Add promo information to notes if applied
    if (promoDiscount > 0) {
      newOrder.notes = `${newOrder.notes || ''}\n\n🎫 Promo Code Applied: ${orderData.promoCode} (Discount: L.E ${promoDiscount})`.trim();
    }

    // Save order to database
    const savedOrder = await Order.create(newOrder);

    // Send email notifications (don't block order creation if emails fail)
    try {
      console.log('📧 Sending order confirmation emails...');
      
      const emailData = {
        customerEmail: savedOrder.customer.email,
        customerName: savedOrder.customer.name,
        orderId: savedOrder.orderId,
        orderItems: savedOrder.products.map(product => ({
          name: product.name,
          quantity: product.quantity,
          price: product.price * product.quantity,
          variant: product.size || product.color ? {
            name: product.size || '',
            size: product.size || '',
            color: product.color || ''
          } : undefined
        })),
        totalAmount: savedOrder.totalAmount,
        shippingCost: savedOrder.shippingCost,
        paymentMethod: savedOrder.paymentMethod,
        shippingAddress: {
          governorate: orderData.customer.governorate || '',
          city: orderData.customer.city || '',
          address: savedOrder.customer.address
        },
        customerPhone: savedOrder.customer.phone
      } as any;

      // Send directly via Nodemailer (avoids NEXTAUTH_URL issues)
      const customerRes = await sendOrderConfirmationEmail(emailData);
      const adminRes = await sendAdminNotificationEmail(emailData);

      if (!customerRes.success || !adminRes.success) {
        console.warn('⚠️ Email send reported failure', { customerRes, adminRes });
      } else {
        console.log('✅ Order confirmation emails sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Error sending order emails:', emailError);
      // Continue with order creation even if emails fail
    }

    // Return success response with order details
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

  } catch (error: unknown) {

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
        error: 'Failed to process order. Please try again.'
      },
      { status: 500 }
    );
  }
}

// GET - Fetch orders for admin (optional, for admin dashboard)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(100); // Limit for performance

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        orderId: order.orderId,
        customer: order.customer,
        products: order.products,
        paymentMethod: order.paymentMethod,
        transactionScreenshot: order.transactionScreenshot,
        totalAmount: order.totalAmount,
        status: order.status,
        orderDate: order.orderDate,
        createdAt: order.createdAt
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
