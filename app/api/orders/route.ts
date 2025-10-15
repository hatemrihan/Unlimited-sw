import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Order, { IOrder } from '../../../models/order';
import Product from '../../../models/product';
import Notification from '../../../models/notification';
import { sendOrderConfirmationEmail, sendAdminNotificationEmail } from '../../../lib/email';

// Ensure Node runtime for Nodemailer
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Store original stock values for rollback if needed
  const stockRollback: Array<{productId: string, variantName?: string, originalStock: number, originalVariantStock?: number}> = [];
  
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
    const finalTotal = subtotalAfterDiscount + orderData.shippingCost + (orderData.codFee || 0);

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

    // 🔥 CRITICAL: Validate and deduct stock before creating order
    console.log('🔍 Validating and deducting stock atomically...');
    
    // Validate and deduct stock for each product in the order using atomic operations
    for (const orderProduct of orderData.products) {
      const product = await Product.findById(orderProduct.productId);
      
      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: `Product not found: ${orderProduct.name}`
          },
          { status: 400 }
        );
      }

      // Check if an order specifies a variant
      if (orderProduct.variant?.name) {
        // If order specifies a variant, product must have variants
        if (!product.variants || product.variants.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Product ${orderProduct.name} does not have variants`
            },
            { status: 400 }
          );
        }
        
        // Find the specific variant
        const variant = product.variants.find((v: any) => 
          v.name === orderProduct.variant?.name
        );
        
        if (!variant) {
          return NextResponse.json(
            {
              success: false,
              error: `Variant not found: ${orderProduct.variant?.name} for ${orderProduct.name}`
            },
            { status: 400 }
          );
        }

        // Check variant stock
        if (variant.stock < orderProduct.quantity) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient stock for ${orderProduct.name} (${orderProduct.variant?.name}). Available: ${variant.stock}, Requested: ${orderProduct.quantity}`
            },
            { status: 400 }
          );
        }

        // Store original values for rollback
        stockRollback.push({
          productId: product._id.toString(),
          variantName: variant.name,
          originalStock: product.stock,
          originalVariantStock: variant.stock
        });

        // Use atomic update to prevent race conditions
        const updateResult = await Product.findOneAndUpdate(
          {
            _id: product._id,
            'variants.name': variant.name,
            'variants.stock': { $gte: orderProduct.quantity },
            stock: { $gte: orderProduct.quantity }
          },
          {
            $inc: {
              'variants.$.stock': -orderProduct.quantity,
              stock: -orderProduct.quantity
            }
          },
          { new: true }
        );

        if (!updateResult) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient stock for ${orderProduct.name} (${variant.name}). Stock may have been updated by another order.`
            },
            { status: 400 }
          );
        }

        // Get updated variant stock for logging
        const updatedVariant = updateResult.variants.find((v: any) => v.name === variant.name);
        console.log(`📦 Atomically deducted ${orderProduct.quantity} from variant ${variant.name} of ${product.name}. Variant stock: ${updatedVariant?.stock}, Total stock: ${updateResult.stock}`);
      } else {
        // No specific variant selected - check if product has variants
        if (product.variants && product.variants.length > 0) {
          // Product has variants but no specific variant was selected
          // Find first available variant with enough stock
          const availableVariant = product.variants.find((v: any) => 
            Number(v.stock || 0) >= orderProduct.quantity
          );
          
          if (!availableVariant) {
            // Calculate total available stock from all variants
            const totalVariantStock = product.variants.reduce((sum: number, v: any) => 
              sum + (Number(v.stock || 0)), 0
            );
            
            return NextResponse.json(
              {
                success: false,
                error: `Insufficient stock for ${orderProduct.name}. Available: ${totalVariantStock}, Requested: ${orderProduct.quantity}`
              },
              { status: 400 }
            );
          }
          
          // Use the available variant
          console.log(`🎯 Auto-selecting variant ${availableVariant.name} for ${product.name}`);
          
          // Store original values for rollback
          stockRollback.push({
            productId: product._id.toString(),
            variantName: availableVariant.name,
            originalStock: product.stock,
            originalVariantStock: availableVariant.stock
          });

          // Use atomic update to prevent race conditions
          const updateResult = await Product.findOneAndUpdate(
            {
              _id: product._id,
              'variants.name': availableVariant.name,
              'variants.stock': { $gte: orderProduct.quantity }
            },
            {
              $inc: { 
                'variants.$.stock': -orderProduct.quantity
              }
            },
            { new: true }
          );

          if (!updateResult) {
            return NextResponse.json(
              {
                success: false,
                error: `Insufficient stock for ${orderProduct.name} (${availableVariant.name}). Stock may have been updated by another order.`
              },
              { status: 400 }
            );
          }

          // Get updated variant stock for logging
          const updatedVariant = updateResult.variants.find((v: any) => v.name === availableVariant.name);
          console.log(`📦 Atomically deducted ${orderProduct.quantity} from auto-selected variant ${availableVariant.name} of ${product.name}. Variant stock: ${updatedVariant?.stock}`);
        } else {
          // Product doesn't have variants - use main product stock
          if (product.stock < orderProduct.quantity) {
            return NextResponse.json(
              {
                success: false,
                error: `Insufficient stock for ${orderProduct.name}. Available: ${product.stock}, Requested: ${orderProduct.quantity}`
              },
              { status: 400 }
            );
          }

          // Store original values for rollback
          stockRollback.push({
            productId: product._id.toString(),
            originalStock: product.stock
          });

          // Use atomic update to prevent race conditions
          const updateResult = await Product.findOneAndUpdate(
            {
              _id: product._id,
              stock: { $gte: orderProduct.quantity }
            },
            {
              $inc: { stock: -orderProduct.quantity }
            },
            { new: true }
          );

          if (!updateResult) {
            return NextResponse.json(
              {
                success: false,
                error: `Insufficient stock for ${orderProduct.name}. Stock may have been updated by another order.`
              },
              { status: 400 }
            );
          }

          console.log(`📦 Atomically deducted ${orderProduct.quantity} from main stock of ${product.name}. New stock: ${updateResult.stock}`);
        }
      }
    }

    console.log('✅ Stock validation and deduction completed successfully');

    // Save order to database
    const savedOrder = await Order.create(newOrder);

    // Create admin notification for new order
    try {
      console.log('🔔 Creating admin notification for new order...');
      
      // Get updated stock levels for notification
      const stockLevels = [];
      for (const orderProduct of orderData.products) {
        const product = await Product.findById(orderProduct.productId);
        if (product) {
          if (product.variants && product.variants.length > 0) {
            const variant = product.variants.find((v: any) => v.name === orderProduct.variant?.name);
            if (variant) {
              stockLevels.push({
                productName: product.name,
                variantName: variant.name,
                remainingStock: variant.stock,
                totalStock: product.stock
              });
            }
          } else {
            stockLevels.push({
              productName: product.name,
              remainingStock: product.stock
            });
          }
        }
      }

      // Create notification
      await Notification.create({
        type: 'order',
        title: `New Order #${savedOrder.orderId}`,
        message: `User ${savedOrder.customer.name} made an order for ${savedOrder.products.length} item(s). Total: L.E ${savedOrder.totalAmount}`,
        data: {
          orderId: savedOrder.orderId,
          customerName: savedOrder.customer.name,
          customerEmail: savedOrder.customer.email,
          totalAmount: savedOrder.totalAmount,
          productCount: savedOrder.products.length,
          stockLevels: stockLevels,
          paymentMethod: savedOrder.paymentMethod
        }
      });

      console.log('✅ Admin notification created successfully');
    } catch (notificationError) {
      console.error('❌ Error creating admin notification:', notificationError);
      // Don't fail the order if notification creation fails
    }

    // Send email notifications (don't block order creation if emails fail)
    try {
      console.log('📧 Sending order confirmation emails...');
      
      const emailData = {
        customerEmail: savedOrder.customer.email,
        customerName: savedOrder.customer.name,
        customerFirstName: orderData.customer.firstName || savedOrder.customer.name.split(' ')[0] || '',
        customerLastName: orderData.customer.lastName || savedOrder.customer.name.split(' ').slice(1).join(' ') || '',
        orderId: savedOrder.orderId,
        orderItems: savedOrder.products.map(product => ({
          name: product.name,
          quantity: product.quantity,
          price: product.price * product.quantity,
          variant: product.size || product.color ? {
            name: product.size || product.color || '',
            size: product.size || '',
            color: product.color || ''
          } : undefined
        })),
        totalAmount: savedOrder.totalAmount,
        shippingCost: savedOrder.shippingCost,
        codFee: savedOrder.codFee || 0,
        paymentMethod: savedOrder.paymentMethod,
        shippingAddress: {
          governorate: orderData.customer.governorate || '',
          city: orderData.customer.city || '',
          address: orderData.customer.address || savedOrder.customer.address,
          apartment: orderData.customer.apartment || ''
        },
        customerPhone: savedOrder.customer.phone,
        customerNotes: orderData.notes || '',
        promoCode: orderData.promoCode || '',
        discountAmount: orderData.discountAmount || 0
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
    // 🔄 ROLLBACK: Restore stock if order creation failed
    if (stockRollback && stockRollback.length > 0) {
      console.log('🔄 Rolling back stock changes due to order creation failure...');
      
      try {
        for (const rollback of stockRollback) {
          const product = await Product.findById(rollback.productId);
          if (product) {
            if (rollback.variantName) {
              // Restore variant stock
              const variant = product.variants.find((v: any) => v.name === rollback.variantName);
              if (variant && rollback.originalVariantStock !== undefined) {
                variant.stock = rollback.originalVariantStock;
                product.stock = rollback.originalStock;
                await product.save();
                console.log(`🔄 Restored variant ${rollback.variantName} stock to ${rollback.originalVariantStock}`);
              }
            } else {
              // Restore main product stock
              product.stock = rollback.originalStock;
              await product.save();
              console.log(`🔄 Restored ${product.name} stock to ${rollback.originalStock}`);
            }
          }
        }
        console.log('✅ Stock rollback completed successfully');
      } catch (rollbackError) {
        console.error('❌ Error during stock rollback:', rollbackError);
      }
    }

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
        promoCode: order.promoCode,           
        discountAmount: order.discountAmount, 
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
