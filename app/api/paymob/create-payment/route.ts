import { NextRequest, NextResponse } from 'next/server';

// Paymob API configuration
const PAYMOB_TOKEN = process.env.PAYMOB_TOKEN;
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID;
const PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET;
const PAYMOB_PUBLIC_KEY = process.env.PAYMOB_PUBLIC_KEY;

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, customer, products } = await request.json();

    if (!orderId || !amount || !customer) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prepare items array from products
    const items = products?.map((product: any) => ({
      name: product.name,
      // Intention API expects currency units (EGP), not cents
      amount: Math.round(product.price),
      description: `${product.name}${product.size ? ` - Size: ${product.size}` : ''}${product.color ? ` - Color: ${product.color}` : ''}`,
      quantity: product.quantity
    })) || [{
      name: `Order #${orderId}`,
      amount: Math.round(amount),
      description: 'Order payment',
      quantity: 1
    }];

    // Create payment intention using new Paymob API
    const intentionResponse = await fetch('https://accept.paymob.com/v1/intention/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${PAYMOB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Intention API uses currency units (EGP)
        amount: Math.round(amount),
        currency: 'EGP',
        payment_methods: [
          PAYMOB_INTEGRATION_ID,
          'card'
        ],
        items: items,
        billing_data: {
          apartment: customer.address.split(',')[1]?.trim() || 'NA',
          first_name: customer.name.split(' ')[0] || customer.name,
          last_name: customer.name.split(' ').slice(1).join(' ') || '',
          street: customer.address.split(',')[0]?.trim() || customer.address,
          building: 'NA',
          phone_number: customer.phone,
          country: 'EG',
          email: customer.email,
          floor: 'NA',
          state: customer.address.split(',').pop()?.trim() || 'Cairo'
        },
        customer: {
          first_name: customer.name.split(' ')[0] || customer.name,
          last_name: customer.name.split(' ').slice(1).join(' ') || '',
          email: customer.email,
          extras: {
            order_id: orderId
          }
        },
        extras: {
          order_id: orderId,
          merchant_order_id: orderId
        }
      }),
    });

    if (!intentionResponse.ok) {
      const errorData = await intentionResponse.text();
      console.error('Paymob intention creation error:', errorData);
      throw new Error('Failed to create payment intention with Paymob');
    }

    const intentionData = await intentionResponse.json();

    // Generate Unified Checkout URL using publicKey + clientSecret
    const paymentUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(
      PAYMOB_PUBLIC_KEY || ''
    )}&clientSecret=${encodeURIComponent(intentionData.client_secret)}`;

    return NextResponse.json({
      success: true,
      payment_url: paymentUrl,
      intention_id: intentionData.id,
      client_secret: intentionData.client_secret,
    });

  } catch (error: any) {
    console.error('Paymob payment creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}
