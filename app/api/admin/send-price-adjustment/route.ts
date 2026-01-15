import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create transporter using Brevo SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.BREVO_SMTP_USER || '969421001@smtp-brevo.com',
        pass: process.env.BREVO_SMTP_PASSWORD,
    },
});

export async function POST(request: NextRequest) {
    try {
        const { toEmail } = await request.json();

        if (!toEmail) {
            return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a1a1a, #333); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #eee; }
    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .order-table th, .order-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    .order-table th { background: #f8f9fa; font-weight: bold; }
    .total-row { background: #e8f5e9 !important; font-weight: bold; font-size: 18px; }
    .highlight-box { background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }
    .success-box { background: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
    h2 { color: #333; margin-top: 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 28px;">UNLIMITED-SW</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">Important Order Update</p>
  </div>
  
  <div class="content">
    <h2>Dear Valued Customer,</h2>
    
    <p>We hope this message finds you well! Thank you for your recent order with <strong>UNLIMITED-SW</strong>.</p>
    
    <p>We are reaching out regarding your order that included:</p>
    <ul>
      <li><strong>Floor Parallettes</strong> (Qty: 1) - 1,399 LE</li>
      <li><strong>Wall-Mounted Pull-Up Bar + Wall-Parallel Bar</strong> (Qty: 1) - 4,958 LE</li>
    </ul>
    
    <h3>📋 Order Summary Correction:</h3>
    
    <table class="order-table">
      <tr>
        <th>Item</th>
        <th style="text-align: right;">Amount</th>
      </tr>
      <tr>
        <td>Products Subtotal</td>
        <td style="text-align: right;">6,357 LE</td>
      </tr>
      <tr>
        <td>Shipping Cost (Cairo)</td>
        <td style="text-align: right;">229 LE</td>
      </tr>
      <tr>
        <td>Cash on Delivery Fee</td>
        <td style="text-align: right;">100 LE</td>
      </tr>
      <tr class="total-row">
        <td>✅ Correct Total</td>
        <td style="text-align: right;">6,686 LE</td>
      </tr>
    </table>
    
    <div class="highlight-box">
      <strong>⚠️ What Happened:</strong><br>
      During the checkout process, a small technical calculation error occurred in our system, resulting in a slightly higher amount being displayed (6,781 LE).
      <br><br>
      <strong>We sincerely apologize for any confusion this may have caused.</strong>
    </div>
    
    <div class="success-box">
      <strong>✅ What This Means For You:</strong><br>
      The <strong>correct total</strong> for your order is <strong>6,686 LE</strong>. When our delivery team arrives, please pay only <strong style="font-size: 20px; color: #28a745;">6,686 LE</strong> instead of 6,781 LE.
      <br><br>
      We have already notified our delivery team about this adjustment, so there will be no issues upon delivery.
    </div>
    
    <h3>🙏 Our Commitment:</h3>
    <p>At UNLIMITED-SW, we are committed to transparency and excellent customer service. We have identified and fixed the technical issue that caused this discrepancy to ensure it doesn't happen again.</p>
    
    <p>If you have any questions or concerns, please don't hesitate to reach out to us.</p>
    
    <p>Thank you for your understanding and for choosing UNLIMITED-SW!</p>
    
    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>The UNLIMITED-SW Team</strong>
    </p>
  </div>
  
  <div class="footer">
    <p>📧 orders@unlimited-sw.com</p>
    <p>© 2024 UNLIMITED-SW. All rights reserved.</p>
  </div>
</body>
</html>
    `;

        const mailOptions = {
            from: {
                name: 'UNLIMITED-SW Store',
                address: 'orders@unlimited-sw.com'
            },
            to: toEmail,
            subject: 'Important Update Regarding Your Order - Price Adjustment 🎉',
            html: emailHtml,
            text: `
Dear Valued Customer,

We hope this message finds you well! Thank you for your recent order with UNLIMITED-SW.

We are reaching out regarding your order that included:
- Floor Parallettes (Qty: 1) - 1,399 LE
- Wall-Mounted Pull-Up Bar + Wall-Parallel Bar (Qty: 1) - 4,958 LE

ORDER SUMMARY CORRECTION:
- Products Subtotal: 6,357 LE
- Shipping Cost (Cairo): 229 LE
- Cash on Delivery Fee: 100 LE
- CORRECT TOTAL: 6,686 LE

During the checkout process, a small technical calculation error occurred in our system, resulting in a slightly higher amount being displayed (6,781 LE).

We sincerely apologize for any confusion this may have caused.

WHAT THIS MEANS FOR YOU:
The correct total for your order is 6,686 LE. When our delivery team arrives, please pay only 6,686 LE instead of 6,781 LE.

We have already notified our delivery team about this adjustment, so there will be no issues upon delivery.

Thank you for your understanding and for choosing UNLIMITED-SW!

Best regards,
The UNLIMITED-SW Team
orders@unlimited-sw.com
      `.trim()
        };

        console.log('📧 Sending price adjustment email to:', toEmail);
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Price adjustment email sent successfully:', result.messageId);

        return NextResponse.json({
            success: true,
            messageId: result.messageId,
            message: `Email sent successfully to ${toEmail}`
        });

    } catch (error) {
        console.error('❌ Error sending email:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send email'
        }, { status: 500 });
    }
}
