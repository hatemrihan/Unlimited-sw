/**
 * The translations between the store and Supabase's shop (shopdb/map.ts):
 * no network, every rule a line. If one of these breaks, the store would
 * show a customer a different product, price or sentence after the move.
 */

import {
  checkoutToDoorPayload,
  doorOrderToEmailData,
  doorOrderToStore,
  doorPaymentMethod,
  doorRefusalToResponse,
  isLegacyId,
  isUuid,
  judgePromo,
  productToRow,
  promoRowToAdmin,
  rowToProduct,
  storePaymentMethod,
} from '@/shopdb/map';

const UUID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const MONGO = '66f0c0ffee0000000000abcd';

describe('ids', () => {
  it('tells an old Mongo id from a uuid', () => {
    expect(isLegacyId(MONGO)).toBe(true);
    expect(isUuid(MONGO)).toBe(false);
    expect(isUuid(UUID)).toBe(true);
    expect(isLegacyId('drop table')).toBe(false);
  });
});

describe('a product row as the storefront sees it', () => {
  const row = {
    id: UUID,
    legacy_id: MONGO,
    name: 'Pull-up bar',
    name_ar: 'عقلة',
    price: '1250.00',
    original_price: null,
    main_image: 'https://x/bar.jpg',
    images: [],
    stock: 7,
    is_active: true,
    sort_order: 2,
    city_pricing: [{ governorate: 'Cairo', shippingCost: 60, codFee: 15, isActive: true }],
    slug: 'pull-up-bar',
    variants: [
      { name: 'L', stock: 3, price: null, sort_order: 1 },
      { name: 'M', stock: 4, price: '0', sort_order: 0 },
    ],
  };

  it('keeps the OLD id public, so saved carts and links keep working', () => {
    expect(rowToProduct(row)._id).toBe(MONGO);
    expect(rowToProduct({ ...row, legacy_id: null })._id).toBe(UUID);
  });

  it('turns numbers back into numbers and orders the variants', () => {
    const p = rowToProduct(row);
    expect(p.price).toBe(1250);
    expect(p.variants.map(v => v.name)).toEqual(['M', 'L']);
    expect(p.order).toBe(2);
    expect(p.cityPricing?.[0].governorate).toBe('Cairo');
  });

  it('never writes stock from a form (the stock door does)', () => {
    expect(productToRow({ name: 'Bar', price: 10, stock: 99 } as any)).not.toHaveProperty('stock');
  });
});

describe('checkout → the door', () => {
  const orderData = {
    clientOrderId: 'attempt-12345678',
    customer: { name: 'Ahmed', email: 'a@x.co', phone: '01001112233', address: '12 St', governorate: 'Cairo', city: 'Nasr City' },
    products: [{ productId: MONGO, name: 'Bar', quantity: 2, size: 'L' }],
    paymentMethod: 'instaPay',
    transactionScreenshot: 'https://bucket.s3.amazonaws.com/r.jpg',
    promoCode: 'SAVE10',
    subtotal: 2500,
    shippingCost: 120,
    codFee: 0,
    totalAmount: 2370,
    notes: '',
  };

  it('sends ids as uuids, the option by NAME, the payment in the door\'s words — and no price', () => {
    const p: any = checkoutToDoorPayload(orderData, () => UUID, (l: any) => l.size);
    expect(p.items).toEqual([{ product_id: UUID, variant_name: 'L', quantity: 2 }]);
    expect(p.payment_method).toBe('instapay');
    expect(p.screenshot_path).toBe(orderData.transactionScreenshot);
    expect(p.claimed).toEqual({ subtotal: 2500, shipping_cost: 120, cod_fee: 0, total_amount: 2370 });
    expect(JSON.stringify(p.items)).not.toContain('price');
  });

  it('maps the two payment words both ways', () => {
    expect(doorPaymentMethod('cashOnDelivery')).toBe('cod');
    expect(storePaymentMethod('cod')).toBe('cashOnDelivery');
    expect(storePaymentMethod('instapay')).toBe('instaPay');
  });
});

describe('the door\'s order → the store\'s order', () => {
  const door = {
    id: UUID,
    order_number: 'ALK123456ABCDEF0123',
    customer_name: 'Ahmed',
    customer_email: 'a@x.co',
    customer_phone: '01001112233',
    customer_address: '12 St',
    apartment: 'Flat 3',
    city: 'Nasr City',
    governorate: 'Cairo',
    payment_method: 'cod',
    payment_status: 'unpaid',
    status: 'pending',
    subtotal: '2500.00',
    shipping_cost: '120.00',
    cod_fee: '30.00',
    discount_amount: '0.00',
    total_amount: '2650.00',
    created_at: '2026-10-16T10:00:00Z',
    items: [{ product_id: UUID, name: 'Bar', price: '1250.00', quantity: 2, variant_name: 'L', image: 'x' }],
  };

  it('uses the database\'s number and money, and the storefront\'s product id', () => {
    const o = doorOrderToStore(door, () => MONGO);
    expect(o.orderId).toBe('ALK123456ABCDEF0123');
    expect(o.totalAmount).toBe(2650);
    expect(o.paymentMethod).toBe('cashOnDelivery');
    expect(o.products[0]).toMatchObject({ productId: MONGO, price: 1250, quantity: 2, variantName: 'L' });
    expect(o.customer.address).toBe('12 St, Flat 3, Nasr City, Cairo');
  });

  it('gives the email templates the governorate and city they print', () => {
    expect(doorOrderToEmailData(door).customer).toMatchObject({ governorate: 'Cairo', city: 'Nasr City', apartment: 'Flat 3' });
  });
});

describe('a refusal → the store\'s answer', () => {
  it('keeps the two 409s apart, as the store always has', () => {
    expect(doorRefusalToResponse('PRICING_MISMATCH')).toMatchObject({ status: 409, body: { code: 'PRICING_MISMATCH' } });
    const promo = doorRefusalToResponse('PROMO_REJECTED:Promo code has expired');
    expect(promo.status).toBe(409);
    expect(promo.body.error).toContain('Promo code has expired');
  });
  it('names the item that sold out', () => {
    expect(doorRefusalToResponse('OUT_OF_STOCK:Hoodie (L)').body.error).toContain('Hoodie (L)');
  });
  it('says "paused" as the store does, and hides anything unknown', () => {
    expect(doorRefusalToResponse('ORDERS_PAUSED')).toMatchObject({ status: 503, body: { code: 'ORDERS_DISABLED' } });
    expect(doorRefusalToResponse('relation does not exist').status).toBe(500);
  });
});

describe('promos, by the database\'s rules', () => {
  const promo = {
    id: UUID,
    code: 'SAVE10',
    discount_type: 'percentage',
    discount_value: '10',
    maximum_discount: '150',
    minimum_order: '500',
    usage_limit: 5,
    used_count: 1,
    is_active: true,
    starts_at: '2026-10-01',
    expires_at: '2026-10-20',
    waive_shipping: false,
  };

  it('a percentage is capped and rounded like Math.round', () => {
    expect(judgePromo(promo, 1004, '2026-10-16')).toMatchObject({ success: true, promo: { discount: 100 } });
    expect(judgePromo(promo, 9000, '2026-10-16')).toMatchObject({ promo: { discount: 150 } });
  });
  it('the window is a calendar day: the last day works', () => {
    expect(judgePromo(promo, 1000, '2026-10-20').success).toBe(true);
    expect(judgePromo(promo, 1000, '2026-10-21')).toMatchObject({ error: 'Promo code has expired' });
    expect(judgePromo(promo, 1000, '2026-09-30')).toMatchObject({ error: 'Promo code is not active yet' });
  });
  it('the minimum and the limit say what is wrong', () => {
    expect(judgePromo(promo, 100, '2026-10-16')).toMatchObject({ error: 'Minimum order of L.E 500.00 required' });
    expect(judgePromo({ ...promo, used_count: 5 }, 1000, '2026-10-16')).toMatchObject({ error: 'Promo code usage limit exceeded' });
    expect(judgePromo(null, 1000)).toMatchObject({ error: 'Invalid promo code' });
  });
  it('the admin page gets the shape it always had', () => {
    expect(promoRowToAdmin(promo)).toMatchObject({ _id: UUID, code: 'SAVE10', discount: 10, type: 'percentage', maxUses: 5, currentUses: 1 });
  });
});
