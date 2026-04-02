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
  codFee?: number;
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
  const paymentMethodDisplay = orderData.paymentMethod === 'cashOnDelivery' ? 'Cash on Delivery' : 'InstaPay';
  const currencySymbol = ' L.E';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - UNLIMITED-SW</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; color: #333;">
      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #ddd;">
        
        <!-- Header -->
        <div style="background-color: #000000; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">
            UNLIMITED-SW
          </h1>
        </div>

        <!-- Body Content -->
        <div style="padding: 30px 40px;">
          
          <!-- Greeting -->
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Dear <strong>${orderData.customerFirstName || orderData.customerName.split(' ')[0]}</strong>,
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Thank you for shopping with us! All of the items from your order <strong>#${orderData.orderId}</strong> have now been confirmed:
          </p>

          <!-- Items List -->
          <div style="margin: 0 0 30px 0; background-color: #f9f9f9; padding: 15px 20px; border-left: 4px solid #4CAF50;">
            ${orderData.orderItems.map(item => `
              <p style="font-size: 16px; line-height: 1.8; margin: 8px 0; padding-bottom: 8px; border-bottom: 1px solid #ddd;">
                <span style="background-color: #000; color: #fff; padding: 2px 6px; border-radius: 3px; font-weight: bold; margin-right: 8px;">${item.quantity}x</span> 
                <strong style="text-decoration: underline; font-size: 17px;">${item.name}</strong>
                ${item.variant ? `<br><span style="color: #666; font-size: 14px; margin-left: 35px;">Variant: ${item.variant.color || item.variant.size || item.variant.name || ''}</span>` : ''}
              </p>
            `).join('')}
          </div>

          <!-- Shipping Address Section -->
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
            They are being shipped to the following address:
          </p>

          <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #000000; margin: 0 0 30px 0;">
            <p style="margin: 0; line-height: 1.8; font-size: 15px;">
              <strong>${orderData.customerName}</strong><br>
              ${orderData.shippingAddress.address}${orderData.shippingAddress.apartment ? ', ' + orderData.shippingAddress.apartment : ''}<br>
              ${orderData.shippingAddress.city}, ${orderData.shippingAddress.governorate}<br>
              Egypt
            </p>
          </div>

          <!-- Order Summary -->
          <div style="border-top: 2px solid #eee; border-bottom: 2px solid #eee; padding: 20px 0; margin: 0 0 30px 0;">
            <table style="width: 100%; font-size: 15px;">
              <tr>
                <td style="padding: 8px 0;">Subtotal</td>
                <td style="padding: 8px 0; text-align: right;">${(orderData.totalAmount - orderData.shippingCost - (orderData.codFee || 0)).toLocaleString()}${currencySymbol}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">Shipping</td>
                <td style="padding: 8px 0; text-align: right;">${orderData.shippingCost.toLocaleString()}${currencySymbol}</td>
              </tr>
              ${orderData.codFee && orderData.codFee > 0 ? `
              <tr>
                <td style="padding: 8px 0;">Cash on Delivery Fee</td>
                <td style="padding: 8px 0; text-align: right;">${orderData.codFee.toLocaleString()}${currencySymbol}</td>
              </tr>
              ` : ''}
              ${orderData.discountAmount && orderData.discountAmount > 0 ? `
              <tr style="color: #28a745;">
                <td style="padding: 8px 0;">Discount (${orderData.promoCode})</td>
                <td style="padding: 8px 0; text-align: right;">-${orderData.discountAmount.toLocaleString()}${currencySymbol}</td>
              </tr>
              ` : ''}
             
              <tr style="font-weight: bold; font-size: 17px;">
                <td style="padding: 12px 0; border-top: 2px solid #000;">Total</td>
                <td style="padding: 12px 0; text-align: right; border-top: 2px solid #000;">${orderData.totalAmount.toLocaleString()}${currencySymbol}</td>
              </tr>
            </table>
          </div>

          <!-- Payment Method -->
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
            <strong>Payment Method:</strong> ${paymentMethodDisplay}
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 0;">
            Thank you for ordering with us at <strong>UNLIMITED-SW</strong>!
          </p>

        </div>

        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">
            <a href="https://unlimited-sw.com" style="color: #000; text-decoration: none; font-weight: bold;">Visit Our Store</a> | 
            <a href="https://unlimited-sw.com/contact-us" style="color: #000; text-decoration: none;">Contact Us</a>
          </p>
          <p style="font-size: 12px; color: #999; margin: 0;">
            © 2025 UNLIMITED-SW. All rights reserved.<br>
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}

function generateAdminEmailTemplate(orderData: OrderEmailData): string {
  const paymentMethodDisplay = orderData.paymentMethod === 'cashOnDelivery' ? 'Cash on Delivery' : 'InstaPay';
  const currencySymbol = ' L.E';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Confirmation</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; color: #333;">
      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #ddd;">
        
        <!-- Header -->
        <div style="background-color: #000000; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">
            UNLIMITED-SW
          </h1>
        </div>

        <!-- Body Content -->
        <div style="padding: 30px 40px;">
          
          <!-- Greeting -->
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; direction: rtl; text-align: right;">
            طلب جديد من <strong>${orderData.customerName}</strong>!
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px 0; direction: rtl; text-align: right;">
            تم تأكيد العناصر التالية للطلب رقم <strong>#${orderData.orderId}</strong>:
          </p>

          <!-- Items List -->
          <div style="margin: 0 0 30px 0; background-color: #f9f9f9; padding: 15px 20px; border-left: 4px solid #4CAF50;">
            ${orderData.orderItems.map(item => `
              <p style="font-size: 16px; line-height: 1.8; margin: 8px 0; padding-bottom: 8px; border-bottom: 1px solid #ddd;">
                <span style="background-color: #000; color: #fff; padding: 2px 6px; border-radius: 3px; font-weight: bold; margin-right: 8px;">${item.quantity}x</span> 
                <strong style="text-decoration: underline; font-size: 17px;">${item.name}</strong>
                ${item.variant ? `<br><span style="color: #666; font-size: 14px; margin-left: 35px;">Variant: ${item.variant.color || item.variant.size || item.variant.name || ''}</span>` : ''}
              </p>
            `).join('')}
          </div>

          <!-- Shipping Address Section -->
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
           بيانات العميل:
          </p>

          <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #000000; margin: 0 0 30px 0;">
            <p style="margin: 0; line-height: 1.8; font-size: 15px;">
              <strong>${orderData.customerName}</strong><br>
              <strong>Phone:</strong> ${orderData.customerPhone}<br>
              <strong>Email:</strong> ${orderData.customerEmail}<br><br>
              <strong>Address:</strong><br>
              ${orderData.shippingAddress.address}${orderData.shippingAddress.apartment ? ', ' + orderData.shippingAddress.apartment : ''}<br>
              ${orderData.shippingAddress.city}, ${orderData.shippingAddress.governorate}<br>
              Egypt
              ${orderData.customerNotes ? `<br><br><strong>Notes:</strong> ${orderData.customerNotes}` : ''}
            </p>
          </div>

          <!-- Order Summary -->
          <div style="border-top: 2px solid #eee; border-bottom: 2px solid #eee; padding: 20px 0; margin: 0 0 30px 0;">
            <table style="width: 100%; font-size: 15px;">
              <tr>
                <td style="padding: 8px 0;">Subtotal</td>
                <td style="padding: 8px 0; text-align: right;">${(orderData.totalAmount - orderData.shippingCost - (orderData.codFee || 0)).toLocaleString()}${currencySymbol}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">Shipping</td>
                <td style="padding: 8px 0; text-align: right;">${orderData.shippingCost.toLocaleString()}${currencySymbol}</td>
              </tr>
              ${orderData.codFee && orderData.codFee > 0 ? `
              <tr>
                <td style="padding: 8px 0;">Cash on Delivery Fee</td>
                <td style="padding: 8px 0; text-align: right;">${orderData.codFee.toLocaleString()}${currencySymbol}</td>
              </tr>
              ` : ''}
              ${orderData.discountAmount && orderData.discountAmount > 0 ? `
              <tr style="color: #28a745;">
                <td style="padding: 8px 0;">Discount (${orderData.promoCode})</td>
                <td style="padding: 8px 0; text-align: right;">-${orderData.discountAmount.toLocaleString()}${currencySymbol}</td>
              </tr>
              ` : ''}
             
              <tr style="font-weight: bold; font-size: 17px;">
                <td style="padding: 12px 0; border-top: 2px solid #000;">Total</td>
                <td style="padding: 12px 0; text-align: right; border-top: 2px solid #000;">${orderData.totalAmount.toLocaleString()}${currencySymbol}</td>
              </tr>
            </table>
          </div>

          <!-- Payment Method -->
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
            <strong>Payment Method:</strong> ${paymentMethodDisplay}
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin: 0;">
            Please process this order from the dashboard.
          </p>

        </div>

        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">
            <a href="https://unlimited-sw.com" style="color: #000; text-decoration: none; font-weight: bold;">Visit Our Store</a> | 
            <a href="https://unlimited-sw.com/admin" style="color: #000; text-decoration: none;">Admin Dashboard</a>
          </p>
          <p style="font-size: 12px; color: #999; margin: 0;">
            © 2025 UNLIMITED-SW. All rights reserved.<br>
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}
