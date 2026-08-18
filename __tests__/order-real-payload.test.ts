/**
 * @jest-environment node
 *
 * The exact payload `app/checkout/page.tsx` sends must be accepted.
 *
 * Adding validation to a route that had almost none is the single riskiest kind
 * of change in this codebase: a rule that is stricter than the form feeding it
 * does not throw in development, it silently refuses real customers' orders in
 * production. This suite pins the real shape, field for field, so any future
 * tightening of the schema has to face it.
 *
 * If this file fails, the shop is broken. Nothing else in the suite means that.
 */
import { createOrderSchema } from '@/order/schema';

/**
 * Built to mirror `handleSubmit` in app/checkout/page.tsx exactly, including the
 * fields the schema does not declare (`status`, `orderDate`) and the ones the
 * form leaves null.
 */
function checkoutPayload(overrides: Record<string, any> = {}) {
  return {
    customer: {
      name: 'Ahmed Hassan',
      firstName: 'Ahmed',
      lastName: 'Hassan',
      email: 'ahmed@example.com',
      phone: '01012345678',
      address: '12 Tahrir Street',
      apartment: 'Flat 3',
      city: 'Cairo',
      governorate: 'Cairo',
    },
    products: [
      {
        productId: '507f1f77bcf86cd799439011',
        name: 'Oversized Hoodie',
        price: 850,
        quantity: 1,
        variant: { name: 'Black / L', color: 'Black' },
        size: 'Black / L',
        color: 'Black',
        image: 'https://example.com/hoodie.jpg',
      },
    ],
    paymentMethod: 'cashOnDelivery',
    // The form initialises this to NULL and only fills it in for InstaPay, so a
    // cash-on-delivery order genuinely sends null — not undefined, not absent.
    transactionScreenshot: null,
    totalAmount: 900,
    subtotal: 850,
    shippingCost: 50,
    codFee: 0,
    promoCode: '',
    discountAmount: 0,
    notes: '',
    status: 'pending',
    orderDate: new Date().toISOString(),
    ...overrides,
  };
}

describe('the real checkout payload', () => {
  it('is accepted for cash on delivery', () => {
    const result = createOrderSchema.safeParse(checkoutPayload());

    if (!result.success) {
      throw new Error(
        `A real checkout order was REFUSED: ${result.error.issues
          .map(i => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`
      );
    }
    expect(result.success).toBe(true);
  });

  it('is accepted for InstaPay with a receipt', () => {
    const result = createOrderSchema.safeParse(
      checkoutPayload({
        paymentMethod: 'instaPay',
        transactionScreenshot: 'https://cdn.example.com/receipt.jpg',
      })
    );

    expect(result.success).toBe(true);
  });

  it('is accepted with a promo code applied', () => {
    const result = createOrderSchema.safeParse(
      checkoutPayload({ promoCode: 'SAVE10', discountAmount: 85, totalAmount: 815 })
    );

    expect(result.success).toBe(true);
  });

  it('is accepted with several lines and a customer note', () => {
    const payload = checkoutPayload({ notes: 'Please call before delivery' });
    payload.products = [
      payload.products[0],
      {
        productId: '507f1f77bcf86cd799439012',
        name: 'Cargo Pants',
        price: 700,
        quantity: 2,
        variant: { name: 'Olive / M', color: 'Olive' },
        size: 'Olive / M',
        color: 'Olive',
        image: 'https://example.com/pants.jpg',
      },
    ];

    expect(createOrderSchema.safeParse(payload).success).toBe(true);
  });

  it('is accepted for a product with no variant', () => {
    const payload = checkoutPayload();
    payload.products = [
      {
        productId: '507f1f77bcf86cd799439011',
        name: 'Gift Card',
        price: 500,
        quantity: 1,
        image: 'https://example.com/card.jpg',
      } as any,
    ];

    expect(createOrderSchema.safeParse(payload).success).toBe(true);
  });

  it('keeps every field the order route and the emails go on to read', () => {
    const result = createOrderSchema.safeParse(checkoutPayload());
    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = result.data;
    expect(data.customer.name).toBe('Ahmed Hassan');
    expect(data.customer.governorate).toBe('Cairo');   // priced per governorate
    expect(data.customer.city).toBe('Cairo');
    expect(data.products[0].variant?.name).toBe('Black / L'); // the stock engine's key
    expect(data.products[0].size).toBe('Black / L');          // legacy fallback
    expect(data.products[0].image).toBeTruthy();              // shown in emails
  });
});
