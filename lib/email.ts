import nodemailer from 'nodemailer';

// Brevo SMTP configuration - Use correct authentication
const createTransporter = () => {
  console.log('🔧 Creating Brevo SMTP transporter...');
  
  // For Brevo SMTP, you need to use the SMTP login (not your email) as the user
  const smtpUser = process.env.BREVO_SMTP_USER || '969421001@smtp-brevo.com';
  const smtpPassword = process.env.BREVO_SMTP_PASSWORD;
  
  if (!smtpPassword) {
    throw new Error('BREVO_SMTP_PASSWORD is required!');
  }
  
  console.log('🔧 SMTP User:', smtpUser);
  console.log('🔧 SMTP Password Set:', !!smtpPassword);
  
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: smtpUser, // Use SMTP login, not sender email
      pass: smtpPassword,
    },
  });
};

const transporter = createTransporter();

// Verify transporter configuration on startup
const verifyTransporter = async () => {
  try {
    // Log current configuration for debugging
    console.log('🔧 BREVO Configuration Check:');
    console.log('- SMTP Login:', process.env.BREVO_SMTP_USER || '969421001@smtp-brevo.com');
    console.log('- SMTP Password Set:', !!process.env.BREVO_SMTP_PASSWORD);
    console.log('- Sender Email:', 'orders@unlimited-sw.com');
    
    if (!process.env.BREVO_SMTP_PASSWORD && !process.env.BREVO_API_KEY) {
      console.error('❌ BREVO email credentials not configured! Check environment variables.');
      console.error('💡 Add BREVO_SMTP_PASSWORD or BREVO_API_KEY to .env.local');
      return false;
    }
    
    await transporter.verify();
    console.log('✅ BREVO email transporter verified successfully');
    return true;
  } catch (error) {
    console.error('❌ BREVO email transporter verification failed:', error);
    console.error('💡 Make sure your .env.local has correct BREVO credentials');
    return false;
  }
};

// Verify on module load
verifyTransporter();

export interface OrderEmailData {
  customerEmail: string;
  customerName: string;
  customerFirstName?: string;
  customerLastName?: string;
  orderId: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
    variant?: {
      name: string;
      size: string;
      color: string;
    };
  }>;
  totalAmount: number;
  shippingCost: number;
  paymentMethod: string;
  shippingAddress: {
    governorate: string;
    city: string;
    address: string;
    apartment?: string;
  };
  customerPhone: string;
  customerNotes?: string;
  promoCode?: string;
  discountAmount?: number;
}

export async function sendOrderConfirmationEmail(orderData: OrderEmailData) {
  try {
    console.log('📧 Sending order confirmation email to:', orderData.customerEmail);

    // Check if email service is configured
    if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) {
      console.error('❌ Brevo email credentials not configured');
      return { 
        success: false, 
        error: 'Email service not configured. Please set BREVO_SMTP_USER and BREVO_SMTP_PASSWORD environment variables.' 
      };
    }

    const emailHtml = generateOrderEmailTemplate(orderData);

    const mailOptions = {
      from: {
        name: 'UNLIMITED-SW Store',
        address: 'orders@unlimited-sw.com' // Use your domain email for better deliverability
      },
      to: orderData.customerEmail,
      subject: `✅ Your Order #${orderData.orderId} is Confirmed - UNLIMITED-SW`,
      html: emailHtml,
      // Anti-spam headers
      headers: {
        'X-Mailer': 'UNLIMITED-SW Order System',
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Reply-To': 'orders@unlimited-sw.com',
        'List-Unsubscribe': '<mailto:orders@unlimited-sw.com?subject=Unsubscribe>',
      },
      // Add plain text version
      text: `
Hello ${orderData.customerName},

Thank you for your order! Your order #${orderData.orderId} has been confirmed.

Order Details:
- Order ID: ${orderData.orderId}
- Total: ${orderData.totalAmount} L.E
- Items: ${orderData.orderItems.length} item(s)

We'll process your order and send you tracking information soon.

Best regards,
UNLIMITED-SW Team
      `.trim(),
    };

    console.log('📧 Attempting to send email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Order confirmation email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      response: (error as any)?.response
    });
    return { success: false, error: error };
  }
}

export async function sendAdminNotificationEmail(orderData: OrderEmailData) {
  try {
    console.log('📧 Sending admin notification email for order:', orderData.orderId);

    // Check if email service is configured
    if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) {
      console.error('❌ Brevo email credentials not configured');
      return { 
        success: false, 
        error: 'Email service not configured. Please set BREVO_SMTP_USER and BREVO_SMTP_PASSWORD environment variables.' 
      };
    }

    const emailHtml = generateAdminEmailTemplate(orderData);

    const mailOptions = {
      from: {
        name: 'UNLIMITED-SW Store',
        address: 'orders@unlimited-sw.com' // Use your domain email for better deliverability
      },
      to: ['hatemrihan100@gmail.com', 'muhamed.alkady@gmail.com'], // Admin emails
      subject: `🛒 New Order #${orderData.orderId} - UNLIMITED-SW`,
      html: emailHtml,
    };

    console.log('📧 Attempting to send admin email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending admin notification email:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      response: (error as any)?.response
    });
    return { success: false, error: error };
  }
}

function generateOrderEmailTemplate(orderData: OrderEmailData): string {
  const itemsHtml = orderData.orderItems.map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px; border-right: 1px solid #eee;">
        <strong>${item.name}</strong>
        ${item.variant ? `<br><small style="color: #666;">Size: ${item.variant.name || item.variant.size} | Color: ${item.variant.color}</small>` : ''}
      </td>
      <td style="padding: 12px; text-align: center; border-right: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right; font-weight: bold;">${item.price.toLocaleString()} LE</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #000 0%, #333 100%); color: white;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">UNLIMITED-SW</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Calisthenics Equipment</p>
      </div>

      <!-- Order Completion Header -->
      <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #f0f8ff; border-radius: 8px; border: 2px solid #000;">
        <h1 style="color: #000; font-size: 32px; margin-bottom: 10px; font-weight: bold;">
          🎉 ${orderData.orderItems.map(item => item.name).join(', ')} [#${orderData.orderId}] COMPLETED!
        </h1>
        <p style="font-size: 18px; color: #333; margin: 0;">Hi ${orderData.customerFirstName || orderData.customerName}, your order has been successfully placed!</p>
      </div>

      <!-- Complete Customer Information -->
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #000;">👤 Customer Information</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 5px 0;"><strong>First Name:</strong> ${orderData.customerFirstName || orderData.customerName.split(' ')[0] || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Last Name:</strong> ${orderData.customerLastName || orderData.customerName.split(' ').slice(1).join(' ') || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${orderData.customerEmail}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${orderData.customerPhone}</p>
          </div>
          <div>
            <p style="margin: 5px 0;"><strong>Order ID:</strong> #${orderData.orderId}</p>
            <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${orderData.paymentMethod === 'cashOnDelivery' ? 'Cash on Delivery' : orderData.paymentMethod === 'instaPay' ? 'InstaPay' : 'Paymob'}</p>
            ${orderData.promoCode ? `<p style="margin: 5px 0;"><strong>Promo Code:</strong> ${orderData.promoCode}</p>` : ''}
            ${orderData.customerNotes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${orderData.customerNotes}</p>` : ''}
          </div>
        </div>
      </div>

      <!-- Complete Shipping Address -->
      <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #000;">🚚 Shipping Address</h3>
        <p style="margin: 5px 0;"><strong>Governorate:</strong> ${orderData.shippingAddress.governorate}</p>
        <p style="margin: 5px 0;"><strong>City:</strong> ${orderData.shippingAddress.city}</p>
        <p style="margin: 5px 0;"><strong>Address:</strong> ${orderData.shippingAddress.address}</p>
        ${orderData.shippingAddress.apartment ? `<p style="margin: 5px 0;"><strong>Apartment/Building:</strong> ${orderData.shippingAddress.apartment}</p>` : ''}
      </div>

      <!-- Order Items -->
      <div style="margin-bottom: 20px;">
        <h3 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">📦 Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background: #000; color: white;">
              <th style="padding: 12px; text-align: left;">Product</th>
              <th style="padding: 12px; text-align: center;">Qty</th>
              <th style="padding: 12px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <!-- Order Summary -->
      <div style="background: #000; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0;">💰 Order Summary</h3>
        <div style="display: flex; justify-content: space-between; margin: 10px 0;">
          <span>Subtotal:</span>
          <span>${(orderData.totalAmount - orderData.shippingCost + (orderData.discountAmount || 0)).toLocaleString()} LE</span>
        </div>
        ${orderData.discountAmount && orderData.discountAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin: 10px 0; color: #4CAF50;">
          <span>Discount (${orderData.promoCode || 'Applied'}):</span>
          <span>-${orderData.discountAmount.toLocaleString()} LE</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; margin: 10px 0;">
          <span>Shipping:</span>
          <span>${orderData.shippingCost.toLocaleString()} LE</span>
        </div>
        <hr style="border: 1px solid #333; margin: 15px 0;">
        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
          <span>Total:</span>
          <span>${orderData.totalAmount.toLocaleString()} LE</span>
        </div>
      </div>

      <!-- Next Steps -->
      <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #2d5a2d;">✅ What's Next?</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>We'll contact you shortly to confirm your order</li>
          <li>Your order will be prepared and shipped</li>
          <li>You'll pay ${orderData.paymentMethod === 'cashOnDelivery' ? 'cash on delivery' : 'as selected'}</li>
          <li>Keep this email for your records</li>
        </ul>
      </div>

      <!-- Contact Info -->
      <div style="text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #000;">Need Help?</h3>
        <p style="margin: 5px 0;">Contact us if you have any questions about your order.</p>
        <p style="margin: 5px 0;"><strong>Website:</strong> <a href="https://unlimited-sw.com" style="color: #000;">unlimited-sw.com</a></p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
        <p>© 2024 UNLIMITED-SW. All rights reserved.</p>
        <p>This email was sent because you placed an order on our website.</p>
      </div>

    </body>
    </html>
  `;
}

function generateAdminEmailTemplate(orderData: OrderEmailData): string {
  const itemsHtml = orderData.orderItems.map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 8px; border-right: 1px solid #eee;">
        <strong>${item.name}</strong>
        ${item.variant ? `<br><small>Size: ${item.variant.name || item.variant.size} | Color: ${item.variant.color}</small>` : ''}
      </td>
      <td style="padding: 8px; text-align: center; border-right: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 8px; text-align: right; font-weight: bold;">${item.price.toLocaleString()} LE</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Order Notification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #28a745;">
        <h2 style="margin: 0; color: #155724;">🛒 New Order Received!</h2>
        <p style="margin: 5px 0 0 0;">Order #${orderData.orderId}</p>
      </div>

      <h3>Customer Information</h3>
      <ul>
        <li><strong>Name:</strong> ${orderData.customerName}</li>
        <li><strong>Email:</strong> ${orderData.customerEmail}</li>
        <li><strong>Phone:</strong> ${orderData.customerPhone}</li>
      </ul>

      <h3>Shipping Address</h3>
      <p>
        <strong>Governorate:</strong> ${orderData.shippingAddress.governorate}<br>
        <strong>City:</strong> ${orderData.shippingAddress.city}<br>
        <strong>Address:</strong> ${orderData.shippingAddress.address}
      </p>

      <h3>Order Details</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="background: #000; color: white;">
            <th style="padding: 10px; text-align: left;">Product</th>
            <th style="padding: 10px; text-align: center;">Qty</th>
            <th style="padding: 10px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${orderData.paymentMethod === 'cashOnDelivery' ? 'Cash on Delivery' : orderData.paymentMethod === 'instaPay' ? 'InstaPay' : 'Paymob'}</p>
        <p style="margin: 5px 0;"><strong>Shipping Cost:</strong> ${orderData.shippingCost.toLocaleString()} LE</p>
        <p style="margin: 5px 0; font-size: 18px;"><strong>Total Amount:</strong> ${orderData.totalAmount.toLocaleString()} LE</p>
      </div>

      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
        <p style="margin: 0;"><strong>Action Required:</strong> Please process this order and contact the customer to confirm delivery details.</p>
      </div>

    </body>
    </html>
  `;
}
