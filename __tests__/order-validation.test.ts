/**
 * @jest-environment node
 *
 * The order route's boundary contract.
 *
 * Two bugs this covers:
 *
 * 1. Contact details were never validated on the server — the email and phone
 *    regexes lived only in the browser, so a direct POST created a real order
 *    with `email: "x"`, decremented stock, and then failed to send any
 *    confirmation.
 *
 * 2. Quantity was never validated at all, and three layers disagreed about how
 *    to coerce it: pricing clamped `Math.max(1, …)`, storage used
 *    `Number(q) || 1`, and reserveStock skipped anything `<= 0`. So `-5` was
 *    priced as one unit, stored as −5 and reserved nothing, and `1.5` drove
 *    `$inc: -1.5`, leaving stock permanently fractional.
 */
import {
  createOrderSchema,
  listOrdersQuerySchema,
  MAX_QUANTITY_PER_LINE,
  MAX_LINES_PER_ORDER,
  MAX_ORDERS_PER_PAGE,
} from '@/order/schema';

/**
 * A minimal order that must always be accepted.
 *
 * `customer` is merged field-by-field so a test can override one field without
 * having to restate the other three.
 */
function validOrder(overrides: Record<string, any> = {}) {
  const { customer: customerOverrides, ...rest } = overrides;

  return {
    customer: {
      name: 'Ahmed Hassan',
      email: 'ahmed@example.com',
      phone: '01012345678',
      address: '12 Tahrir Street, Cairo',
      ...(customerOverrides || {}),
    },
    products: [
      {
        productId: '507f1f77bcf86cd799439011',
        name: 'Hoodie',
        price: 450,
        quantity: 2,
        image: 'https://example.com/a.jpg',
      },
    ],
    paymentMethod: 'cashOnDelivery',
    totalAmount: 900,
    subtotal: 900,
    shippingCost: 0,
    ...rest,
  };
}

function parse(order: Record<string, any>) {
  return createOrderSchema.safeParse(order);
}

/** The first error message, which is what the route returns to the customer. */
function firstError(order: Record<string, any>) {
  const result = parse(order);
  return result.success ? null : result.error.issues[0].message;
}

describe('a well-formed order is accepted', () => {
  it('passes and keeps its values', () => {
    const result = parse(validOrder());

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.products[0].quantity).toBe(2);
    expect(result.data.customer.email).toBe('ahmed@example.com');
  });

  it('accepts a legacy (non-ObjectId) product id, because the route migrates those by name', () => {
    const result = parse(validOrder({
      products: [{
        productId: 'static-product-1',
        name: 'Hoodie',
        price: 450,
        quantity: 1,
        image: 'https://example.com/a.jpg',
      }],
    }));

    expect(result.success).toBe(true);
  });
});

describe('quantity', () => {
  function withQuantity(quantity: unknown) {
    return validOrder({
      products: [{
        productId: '507f1f77bcf86cd799439011',
        name: 'Hoodie',
        price: 450,
        quantity,
        image: 'https://example.com/a.jpg',
      }],
    });
  }

  it('rejects a negative quantity', () => {
    // Used to be priced as 1, stored as −5, and reserve nothing.
    expect(firstError(withQuantity(-5))).toMatch(/at least 1/i);
  });

  it('rejects zero', () => {
    expect(firstError(withQuantity(0))).toMatch(/at least 1/i);
  });

  it('rejects a fractional quantity', () => {
    // Used to drive `$inc: -1.5` and leave stock permanently fractional.
    expect(firstError(withQuantity(1.5))).toMatch(/whole number/i);
  });

  it('rejects a quantity above the per-line cap', () => {
    expect(firstError(withQuantity(MAX_QUANTITY_PER_LINE + 1))).toMatch(/cannot exceed/i);
  });

  it('accepts exactly the cap', () => {
    expect(parse(withQuantity(MAX_QUANTITY_PER_LINE)).success).toBe(true);
  });

  it('rejects a non-numeric quantity', () => {
    expect(parse(withQuantity('2')).success).toBe(false);
    expect(parse(withQuantity(null)).success).toBe(false);
  });

  it('rejects NaN and Infinity', () => {
    expect(parse(withQuantity(NaN)).success).toBe(false);
    expect(parse(withQuantity(Infinity)).success).toBe(false);
  });
});

describe('customer email', () => {
  it('rejects a value that is not an email', () => {
    expect(firstError(validOrder({ customer: { email: 'x' } }))).toMatch(/valid email/i);
  });

  it('rejects an empty email', () => {
    expect(parse(validOrder({ customer: { email: '' } })).success).toBe(false);
  });

  it('lower-cases and trims, so the confirmation reaches the same inbox', () => {
    const result = parse(validOrder({ customer: { email: '  Ahmed@Example.COM  ' } }));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.customer.email).toBe('ahmed@example.com');
  });
});

describe('customer phone', () => {
  it.each(['01012345678', '01112345678', '01212345678', '01512345678'])(
    'accepts %s',
    phone => {
      expect(parse(validOrder({ customer: { phone } })).success).toBe(true);
    }
  );

  it.each([
    ['+20 100 123 4567 (international, spaced)', '+201001234567', '01001234567'],
    ['0020 prefix', '00201001234567', '01001234567'],
    ['dashes', '010-1234-5678', '01012345678'],
  ])('normalises %s rather than rejecting it', (_label, input, expected) => {
    const result = parse(validOrder({ customer: { phone: input } }));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.customer.phone).toBe(expected);
  });

  it.each([
    ['a landline', '0223456789'],
    ['an unassigned prefix', '01312345678'],
    ['too short', '0101234567'],
    ['too long', '010123456789'],
    ['letters', 'not-a-phone'],
  ])('rejects %s', (_label, phone) => {
    expect(parse(validOrder({ customer: { phone } })).success).toBe(false);
  });
});

describe('order shape', () => {
  it('rejects an empty basket', () => {
    expect(firstError(validOrder({ products: [] }))).toMatch(/at least one product/i);
  });

  it('rejects more lines than the cap', () => {
    const line = {
      productId: '507f1f77bcf86cd799439011',
      name: 'Hoodie',
      price: 1,
      quantity: 1,
      image: 'https://example.com/a.jpg',
    };
    const products = Array.from({ length: MAX_LINES_PER_ORDER + 1 }, () => ({ ...line }));

    expect(firstError(validOrder({ products }))).toMatch(/more than/i);
  });

  it('rejects an unknown payment method', () => {
    expect(firstError(validOrder({ paymentMethod: 'bitcoin' }))).toMatch(/valid payment method/i);
  });

  it('rejects InstaPay with no transaction screenshot', () => {
    const error = firstError(validOrder({ paymentMethod: 'instaPay' }));
    expect(error).toMatch(/screenshot/i);
  });

  it('accepts InstaPay with a screenshot', () => {
    const result = parse(validOrder({
      paymentMethod: 'instaPay',
      transactionScreenshot: 'https://example.com/receipt.jpg',
    }));

    expect(result.success).toBe(true);
  });

  it('rejects a missing address', () => {
    expect(parse(validOrder({ customer: { address: '   ' } })).success).toBe(false);
  });
});

describe('admin list query', () => {
  it('falls back to page 1 for nonsense, instead of skip: NaN', () => {
    expect(listOrdersQuerySchema.parse({ page: 'abc' }).page).toBe(1);
    expect(listOrdersQuerySchema.parse({ page: '-3' }).page).toBe(1);
    expect(listOrdersQuerySchema.parse({}).page).toBe(1);
  });

  it('refuses to return the whole customer database in one request', () => {
    // ?limit=999999 used to return every order, with every customer's name,
    // email, phone and full address.
    expect(listOrdersQuerySchema.parse({ limit: '999999' }).limit).toBeLessThanOrEqual(
      MAX_ORDERS_PER_PAGE
    );
    expect(listOrdersQuerySchema.parse({ limit: '0' }).limit).toBeGreaterThan(0);
  });

  it('accepts a legitimate page and limit', () => {
    const query = listOrdersQuerySchema.parse({ page: '3', limit: '25' });

    expect(query.page).toBe(3);
    expect(query.limit).toBe(25);
  });

  it('ignores an unknown sort field rather than passing it to MongoDB', () => {
    expect(listOrdersQuerySchema.parse({ sortBy: 'customer.password' }).sortBy).toBe('createdAt');
    expect(listOrdersQuerySchema.parse({ sortDir: 'sideways' }).sortDir).toBe('desc');
  });

  it('accepts the sorts the admin table offers', () => {
    expect(listOrdersQuerySchema.parse({ sortBy: 'totalAmount', sortDir: 'asc' })).toMatchObject({
      sortBy: 'totalAmount',
      sortDir: 'asc',
    });
  });

  it('ignores an unknown status filter', () => {
    expect(listOrdersQuerySchema.parse({ status: 'refunded' }).status).toBeUndefined();
    expect(listOrdersQuerySchema.parse({ status: 'shipped' }).status).toBe('shipped');
  });
});
