import { sendOrderConfirmationEmail, sendAdminNotificationEmail } from '../lib/email';
import Notification from '../models/notification';
import Product from '../models/product';
import { logger } from '../utils/logger';

/**
 * Handles all peripheral asynchronous events triggered post-Order creation.
 * Throws execution straight onto the Node event loop skipping wire blocks, 
 * guaranteeing rapid API resolutions for customers.
 */
export function dispatchOrderPostProcessing(savedOrder: any, orderData: any) {
  return processAsyncRoutines(savedOrder, orderData).catch(err => {
    logger.error("❌ Isolated background queue failed safely:", err);
  });
}

// Internal execution queue mapped below API response boundaries
async function processAsyncRoutines(savedOrder: any, orderData: any) {
  // 1. Compile Internal Analytics/Notifications First
  if (process.env.MONGO_BYPASS !== 'true') {
    try {
        const stockLevels = [];
        const productIds = orderData.products.map((p: any) => p.productId);
        const productsList = await Product.find({ _id: { $in: productIds } });
        const productMap = new Map(productsList.map((p: any) => [p._id.toString(), p]));

        for (const orderProduct of orderData.products) {
          const product = productMap.get(orderProduct.productId?.toString());
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
    } catch(notificationError) { 
        logger.error('Notification queue failed', notificationError) 
    }
  }

  // 2. Dispatch Bulk Nodemailer Events
  try {
      const emailData = {
        customerEmail: savedOrder.customer.email,
        customerName: savedOrder.customer.name,
        customerFirstName: orderData.customer.firstName || savedOrder.customer.name.split(' ')[0] || '',
        customerLastName: orderData.customer.lastName || savedOrder.customer.name.split(' ').slice(1).join(' ') || '',
        orderId: savedOrder.orderId,
        orderItems: savedOrder.products.map((product: any) => ({
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

      await Promise.all([
        sendOrderConfirmationEmail(emailData),
        sendAdminNotificationEmail(emailData)
      ]);
  } catch(emailError) { 
      logger.error('Email queue failed', emailError) 
  }
}
