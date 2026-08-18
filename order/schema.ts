import { z } from 'zod';

/**
 * Validation for an incoming order, at the route boundary.
 *
 * Two separate problems this closes.
 *
 * **Contact details were never checked on the server.** The email and Egyptian
 * phone regexes lived only in `app/checkout/hooks/useCheckoutForm.ts`, which runs
 * in the browser. A direct POST created a real order with `email: "x"`: stock
 * decremented, the confirmation email then failed to send, and for a
 * cash-on-delivery order there was no valid number to call the customer back on.
 *
 * **Quantity was never checked at all**, and three layers disagreed about how to
 * coerce it — pricing clamped with `Math.max(1, …)`, the order stored
 * `Number(q) || 1`, and `reserveStock` skipped anything `<= 0`. So `quantity: -5`
 * was priced as one unit, stored as −5 and reserved nothing, while `quantity: 1.5`
 * drove `$inc: -1.5` and left the product's stock permanently fractional — a
 * number that never errors and never reconciles.
 *
 * Validating once, here, is what makes those three layers agree: nothing
 * downstream ever sees a quantity that is not a positive integer.
 */

/** A clothing order line. Above this, it is a data-entry mistake or an attack. */
export const MAX_QUANTITY_PER_LINE = 100;

/** Distinct products in one order. The cart UI cannot realistically exceed this. */
export const MAX_LINES_PER_ORDER = 50;

/**
 * Egyptian mobile numbers: 010, 011, 012, 015 followed by eight digits.
 *
 * Deliberately more forgiving than the checkout form, which demands exactly
 * `01xxxxxxxxx`. Spaces, dashes and an international prefix are stripped first,
 * so a number typed as `+20 100 123 4567` is accepted rather than rejected by a
 * server that is stricter than the form the customer just filled in. Being
 * stricter here than the client is how you turn validation into lost orders.
 */
const EGYPTIAN_MOBILE = /^01[0125]\d{8}$/;

function normalisePhone(raw: string): string {
  const digitsOnly = raw.replace(/[\s()-]/g, '');
  return digitsOnly
    .replace(/^\+20/, '0')
    .replace(/^0020/, '0')
    .replace(/^20(?=1[0125])/, '0');
}

const phone = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .transform(normalisePhone)
  .refine(value => EGYPTIAN_MOBILE.test(value), {
    message: 'Enter a valid Egyptian mobile number, e.g. 01012345678',
  });

const customerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(320),
  phone,
  address: z.string().trim().min(1, 'Address is required').max(1000),

  // Sent by checkout, used for per-governorate shipping and COD. Optional
  // because an order can be priced without them — they simply yield no city
  // pricing rather than an error.
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  apartment: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  governorate: z.string().trim().max(120).optional(),
});

/**
 * `productId` is only checked for shape, not for being a MongoDB id: a cart
 * saved before the static-fallback removal still holds a legacy id, and
 * `resolveLegacyProductIds` migrates those by name further down the route.
 * Rejecting them here would refuse orders the server is able to recover.
 */
const orderLineSchema = z.object({
  productId: z.string().trim().min(1, 'Product id is required').max(120),
  name: z.string().trim().min(1, 'Product name is required').max(300),

  // A claim only. Every monetary field is recomputed from the database by
  // orderPricingService and this value is never persisted as-is.
  price: z.number().finite().nonnegative().default(0),

  quantity: z
    .number({ error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .positive('Quantity must be at least 1')
    .max(MAX_QUANTITY_PER_LINE, `Quantity cannot exceed ${MAX_QUANTITY_PER_LINE} per item`),

  image: z.string().trim().min(1, 'Product image is required').max(2000),

  // The explicit variant identity the stock engine decrements against.
  variant: z
    .object({
      name: z.string().trim().min(1).max(200),
      color: z.string().trim().max(100).optional(),
    })
    .optional(),

  // Legacy flattened form, kept for display and for the server's fallback.
  size: z.string().trim().max(200).optional(),
  color: z.string().trim().max(100).optional(),
});

/** Money claimed by the browser. Checked against the server's own arithmetic. */
const claimedAmount = z.number().finite().nonnegative().default(0);

export const createOrderSchema = z
  .object({
    customer: customerSchema,

    products: z
      .array(orderLineSchema)
      .min(1, 'Order must contain at least one product')
      .max(MAX_LINES_PER_ORDER, `An order cannot contain more than ${MAX_LINES_PER_ORDER} items`),

    paymentMethod: z.enum(['cashOnDelivery', 'instaPay'], {
      error: 'Choose a valid payment method',
    }),

    /**
     * `nullish`, not `optional`.
     *
     * `useCheckoutForm` initialises this field to `null` and only fills it in
     * for InstaPay, so every cash-on-delivery order — the majority of them —
     * genuinely sends `null`. `.optional()` accepts `undefined` and rejects
     * `null`, which would have refused those orders outright with "expected
     * string, received null". Normalised to `undefined` so nothing downstream
     * has to know the difference.
     */
    transactionScreenshot: z
      .string()
      .trim()
      .max(2000)
      .nullish()
      .transform(value => value || undefined),

    totalAmount: claimedAmount,
    subtotal: claimedAmount,
    shippingCost: claimedAmount,
    codFee: claimedAmount,
    discountAmount: claimedAmount,

    promoCode: z.string().trim().max(40).optional().default(''),
    notes: z.string().trim().max(2000).optional().default(''),

    /**
     * One checkout attempt's id, minted by the browser.
     *
     * Deliberately not `.uuid()`: the client falls back to a random hex string
     * on browsers without `crypto.randomUUID`, and rejecting those would strip
     * the protection from exactly the old, slow devices that need it most.
     * Bounded and alphanumeric instead — it is only ever compared, never parsed.
     *
     * Optional, so a page cached before this shipped still checks out; it
     * simply goes unprotected, as it does today.
     */
    clientOrderId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]{8,64}$/, 'Invalid checkout attempt id')
      .optional(),

    /**
     * The analytics session this order came from, so the funnel can join a
     * purchase back to the browsing that led to it.
     *
     * Optional and never required. It is measurement, and an order must never
     * be refused because a customer blocks storage or arrives with tracking
     * disabled — those are customers, not problems. When it is missing the
     * server records the purchase against a synthetic id: revenue stays
     * correct, only the session join is lost.
     *
     * NOT stored on the order document. The order has no use for it, and a
     * field that exists only for analytics is how order schemas rot.
     */
    sessionId: z.string().trim().uuid().optional(),
  })
  // InstaPay without proof of payment is an order nobody can fulfil.
  .refine(data => data.paymentMethod !== 'instaPay' || Boolean(data.transactionScreenshot), {
    message: 'Transaction screenshot is required for InstaPay payments',
    path: ['transactionScreenshot'],
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Query validation for the admin order list.
 *
 * `parseInt` with no guard turned `?page=abc` into `NaN` and then `skip: NaN`,
 * and an uncapped `limit` meant `?limit=999999` returned the entire orders
 * collection — every customer's name, email, phone and address — in one
 * response. `coerce` plus a ceiling makes both impossible.
 */
export const MAX_ORDERS_PER_PAGE = 100;

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(MAX_ORDERS_PER_PAGE).catch(50),
  search: z.string().trim().max(200).optional().catch(undefined),
  status: z
    .enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
    .optional()
    .catch(undefined),
  sortBy: z.enum(['createdAt', 'orderDate', 'totalAmount', 'status']).catch('createdAt'),
  sortDir: z.enum(['asc', 'desc']).catch('desc'),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
