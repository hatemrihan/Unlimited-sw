import { NextRequest, NextResponse } from 'next/server';
import { sendOrderConfirmationEmail, sendAdminNotificationEmail, OrderEmailData } from '../../../lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, orderData }: { type: 'customer' | 'admin' | 'both', orderData: OrderEmailData } = body;

    console.log('📧 Email request received:', { type, orderId: orderData.orderId });

    const results = {
      customer: null as any,
      admin: null as any
    };

    // Send customer email
    if (type === 'customer' || type === 'both') {
      console.log('📧 Sending customer email...');
      results.customer = await sendOrderConfirmationEmail(orderData);
    }

    // Send admin email
    if (type === 'admin' || type === 'both') {
      console.log('📧 Sending admin email...');
      results.admin = await sendAdminNotificationEmail(orderData);
    }

    // Check if any emails failed
    const customerFailed = results.customer && !results.customer.success;
    const adminFailed = results.admin && !results.admin.success;

    if (customerFailed || adminFailed) {
      console.warn('⚠️ Some emails failed to send:', { customerFailed, adminFailed });
      return NextResponse.json({
        success: false,
        message: 'Some emails failed to send',
        results
      }, { status: 207 }); // 207 Multi-Status
    }

    console.log('✅ All emails sent successfully');
    return NextResponse.json({
      success: true,
      message: 'Emails sent successfully',
      results
    });

  } catch (error) {
    console.error('❌ Error in email API:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to send emails',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}





















