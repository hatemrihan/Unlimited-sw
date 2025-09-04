import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = JSON.parse(body);
    
    console.log('Paymob webhook received:', data);
    
    // Verify HMAC signature if provided
    if (PAYMOB_HMAC_SECRET) {
      const hmac = crypto.createHmac('sha512', PAYMOB_HMAC_SECRET);
      hmac.update(body);
      const calculatedHmac = hmac.digest('hex');
      
      const receivedHmac = request.headers.get('x-paymob-signature');
      
      if (calculatedHmac !== receivedHmac) {
        console.error('Invalid HMAC signature');
        return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
      }
    }

    // Handle different webhook event types
    const { type, data: eventData } = data;
    
    switch (type) {
      case 'TRANSACTION_SUCCESSFUL':
        console.log('Payment successful:', eventData);
        // Update order status to 'paid' in your database
        // You can add your order update logic here
        await updateOrderStatus(eventData.order_id, 'paid');
        return NextResponse.json({ success: true, message: 'Payment processed successfully' });
        
      case 'TRANSACTION_PENDING':
        console.log('Payment pending:', eventData);
        await updateOrderStatus(eventData.order_id, 'pending');
        return NextResponse.json({ success: true, message: 'Payment pending' });
        
      case 'TRANSACTION_FAILED':
        console.log('Payment failed:', eventData);
        await updateOrderStatus(eventData.order_id, 'failed');
        return NextResponse.json({ success: false, message: 'Payment failed' });
        
      default:
        console.log('Unknown webhook event type:', type);
        return NextResponse.json({ success: true, message: 'Event received' });
    }

  } catch (error: any) {
    console.error('Paymob webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Helper function to update order status
async function updateOrderStatus(orderId: string, status: string) {
  try {
    // Update order status in your database
    // This is a placeholder - implement based on your database structure
    console.log(`Updating order ${orderId} status to ${status}`);
    
    // Example: Update order in MongoDB
    // await Order.findOneAndUpdate(
    //   { orderId: orderId },
    //   { status: status, updatedAt: new Date() }
    // );
    
  } catch (error) {
    console.error('Error updating order status:', error);
  }
}
