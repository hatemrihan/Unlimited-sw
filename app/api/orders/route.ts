import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import { orderQueries } from '@/order/queries';
import { createOrderTransaction, findOrderByClientId, resolveVariantName, resolveLegacyProductIds } from '../../../services/orderCreationService';
import { computeOrderPricing, findPricingMismatches, ServerPricing } from '../../../services/orderPricingService';
import { dispatchOrderPostProcessing } from '../../../services/emailQueueService';
import { recordPurchase } from '../../../analytics/purchase';
import { logger } from '../../../utils/logger';
import { requireAdmin } from '../../../lib/requireAdmin';
import { createOrderSchema, listOrdersQuerySchema } from '@/order/schema';
import { consumeRateLimit, clientKey } from '../../../lib/throttle';
import { sellsFromSupabase } from '@/shopdb/client';
import { movedToDashboard } from '@/shopdb/moved';
import { placeOrder } from '@/shopdb/orders';

const MONGO_BYPASS = process.env.MONGO_BYPASS === 'true';

// MONGO_BYPASS accepts orders and returns success while writing nothing and
// decrementing nothing — every order placed under it is silently lost. That is
// a maintenance-mode tool, never a production one.
//
// This refuses the ORDER, not the build: throwing at module scope would break
// `next build` itself and take the whole site down, which is a worse failure
// than the one it guards against.
const BYPASS_FORBIDDEN = MONGO_BYPASS && process.env.NODE_ENV === 'production';

if (BYPASS_FORBIDDEN) {
  console.error(
    '🚨 MONGO_BYPASS is enabled in production. Orders will be REFUSED rather than silently discarded. Unset MONGO_BYPASS.'
  );
}

// Ensure Node runtime for Nodemailer
export const runtime = 'nodejs';

/**
 * Order throttle.
 *
 * Deliberately generous. Egyptian mobile networks put very large numbers of
 * customers behind a single carrier-grade NAT address, so an aggressive
 * per-IP limit would refuse real orders from people who share an operator —
 * a far more expensive failure than the scripted abuse it prevents. This is
 * sized to stop a loop, not to ration customers.
 */
const ORDER_RATE_LIMIT = { limit: 20, windowMs: 15 * 60 * 1000 };

/**
 * The order as the customer's browser is told about it.
 *
 * Shared by the two paths that can produce one — a fresh order, and a repeat of
 * a checkout attempt that already succeeded — so a customer whose connection
 * dropped sees exactly what they would have seen the first time. Deliberately
 * not `savedOrder` itself: that document carries internal fields the storefront
 * has no business receiving.
 */
function orderResponsePayload(savedOrder: any) {
  return {
    orderId: savedOrder.orderId,
    customer: savedOrder.customer,
    products: savedOrder.products,
    paymentMethod: savedOrder.paymentMethod,
    transactionScreenshot: savedOrder.transactionScreenshot,
    totalAmount: savedOrder.totalAmount,
    subtotal: savedOrder.subtotal,
    shippingCost: savedOrder.shippingCost,
    status: savedOrder.status,
    notes: savedOrder.notes,
    orderDate: savedOrder.orderDate,
    createdAt: savedOrder.createdAt,
  };
}

/**
 * Prices an order from the database and checks the browser's claims against it.
 * Returns either the authoritative pricing or the response to send back.
 */
async function priceOrder(
  orderData: any
): Promise<{ pricing: ServerPricing } | { response: NextResponse }> {
  const pricingResult = await computeOrderPricing(orderData);

  if (!pricingResult.success || !pricingResult.pricing) {
    return {
      response: NextResponse.json(
        { success: false, error: pricingResult.error || 'Failed to price this order. Please refresh and try again.' },
        { status: 400 }
      ),
    };
  }

  // A disagreement means either tampering or a stale page. Either way the
  // customer must not be charged a number they never saw, so refuse rather
  // than silently substituting our own total.
  const mismatches = findPricingMismatches(orderData, pricingResult.pricing);
  if (mismatches.length > 0) {
    const { promoError } = pricingResult.pricing;

    logger.warn('💰 Order pricing mismatch — rejecting', {
      mismatches,
      promoError,
      customerEmail: orderData.customer?.email,
    });

    // If the customer submitted a promo code the server would not accept, THAT
    // is what changed the total — say so. Reporting "the prices changed" sends
    // them off to refresh a page that will show exactly the same number.
    return {
      response: NextResponse.json(
        promoError
          ? {
              success: false,
              error: `${promoError}. Your order total has been updated without the discount — please review it before continuing.`,
              code: 'PROMO_REJECTED',
            }
          : {
              success: false,
              error: 'Prices changed while you were checking out. Refresh to see the current total before you continue.',
              code: 'PRICING_MISMATCH',
            },
        { status: 409 }
      ),
    };
  }

  return { pricing: pricingResult.pricing };
}

export async function POST(request: NextRequest) {
  try {
    // Refusing is recoverable; accepting and discarding is not.
    if (BYPASS_FORBIDDEN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Orders are paused for maintenance right now. Please try again shortly, or contact us.',
          code: 'ORDERS_DISABLED',
        },
        { status: 503 }
      );
    }

    // Connect to database
    if (!MONGO_BYPASS) await dbConnect();

    // Each attempt opens a transaction, reserves stock and sends mail over SMTP,
    // so an unthrottled loop is expensive well before it is malicious.
    if (!MONGO_BYPASS) {
      const throttle = await consumeRateLimit(
        `order:${clientKey(request.headers)}`,
        ORDER_RATE_LIMIT
      );

      if (!throttle.allowed) {
        logger.warn('🚦 Order refused by rate limit', { retryAfter: throttle.retryAfterSeconds });
        return NextResponse.json(
          {
            success: false,
            error: 'Too many orders in a short time. Please wait a moment and try again, or contact us if you need help.',
            code: 'RATE_LIMITED',
          },
          { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
        );
      }
    }

    // Parse and validate the request body in one step.
    //
    // This replaces ~90 lines of hand-written `if` blocks that only ever checked
    // for empty strings — no email format, no phone format, and no quantity
    // validation at all. See order/schema.ts for what each rule is
    // protecting against.
    const rawBody = await request.json();
    const parsed = createOrderSchema.safeParse(rawBody);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      logger.warn('❌ Order rejected by validation', {
        path: issue?.path.join('.'),
        message: issue?.message,
      });
      return NextResponse.json(
        {
          success: false,
          error: issue?.message || 'Some of the order details are not valid. Please check and try again.',
          field: issue?.path.join('.') || undefined,
          code: 'VALIDATION_FAILED',
        },
        { status: 400 }
      );
    }

    // Everything downstream reads the validated, normalised copy — never the raw
    // body. Quantities are positive integers from here on, so pricing, storage
    // and stock reservation can no longer disagree about them.
    const orderData: any = parsed.data;

    // After the move (SHOP_DB=supabase): ONE call to the database's door,
    // which replays a repeated attempt, prices, reserves, claims the promo
    // and owes the email in one transaction. Everything below this branch
    // is the MongoDB path, untouched.
    if (sellsFromSupabase()) return placeThroughSupabase(orderData);

    // A customer whose response was lost pressing "Place order" again. Answer
    // with the order they already have, before pricing, before reserving
    // anything — a retry must cost them nothing and cost the warehouse nothing.
    if (!MONGO_BYPASS && orderData.clientOrderId) {
      const alreadyPlaced = await findOrderByClientId(orderData.clientOrderId);
      if (alreadyPlaced) {
        logger.info('↩️ Returning the order this checkout attempt already placed', {
          orderId: alreadyPlaced.orderId,
        });
        return NextResponse.json({
          success: true,
          order: orderResponsePayload(alreadyPlaced),
          message: 'Order placed successfully!'
        });
      }
    }

    // A cart saved before the static-fallback removal can still hold a
    // non-MongoDB product id. Migrate it by name the way the cart does, so
    // those customers complete their order instead of hitting a hard error.
    if (!MONGO_BYPASS) {
      const unresolved = await resolveLegacyProductIds(orderData);
      if (unresolved.length > 0) {
        const names = unresolved.map((line: any) => line.name || 'an item').join(', ');
        logger.warn('🧭 Order rejected: unresolvable legacy product ids', { names });
        return NextResponse.json(
          {
            success: false,
            error: `These items are not available to order right now: ${names}. Please refresh the page and your cart, then try again.`,
            code: 'UNKNOWN_PRODUCT',
          },
          { status: 400 }
        );
      }
    }

    // 💰 Recompute every monetary field from MongoDB. The request body's price,
    // subtotal, shippingCost, codFee and totalAmount are treated as claims to be
    // checked, never as inputs — otherwise a crafted POST buys anything for 1 EGP.
    const priced = MONGO_BYPASS ? { pricing: null } : await priceOrder(orderData);
    if ('response' in priced) return priced.response;

    const pricing = priced.pricing;
    const promoDiscount = pricing?.discountAmount || 0;

    // Server-computed money, keyed by line so each product row gets its own price.
    const serverPriceByLine = new Map(
      (pricing?.lines || []).map(line => [`${line.productId}::${line.variantName ?? ''}`, line.price])
    );
    const finalTotal = pricing ? pricing.totalAmount : Number(orderData.totalAmount) || 0;

    // Create order object
    const newOrder: any = {
      customer: {
        name: orderData.customer.name?.trim() || '',
        email: orderData.customer.email?.trim() || '',
        phone: orderData.customer.phone?.trim() || '',
        address: orderData.customer.address?.trim() || ''
      },

      products: orderData.products.map((product: unknown) => {
        const prod = product as any; // Type assertion for now
        // Record the variant the stock engine will actually decrement, so
        // cancellations can restock the right element.
        const variantName = resolveVariantName(prod);
        const serverPrice = serverPriceByLine.get(`${prod.productId || ''}::${variantName ?? ''}`);
        return {
          productId: prod.productId || '',
          name: prod.name || '',
          // Always the database's price, never the body's.
          price: serverPrice ?? (Number(prod.price) || 0),
          // Already a validated positive integer — the schema is what makes the
          // stored quantity, the priced quantity and the reserved quantity agree.
          quantity: prod.quantity,
          variantName,
          size: prod.size || undefined,
          color: prod.color || undefined,
          image: prod.image || ''
        }
      }),
      paymentMethod: orderData.paymentMethod,
      transactionScreenshot: orderData.transactionScreenshot || undefined,
      totalAmount: Number(finalTotal) || 0,
      subtotal: pricing ? pricing.subtotal : Number(orderData.subtotal) || 0,
      shippingCost: pricing ? pricing.shippingCost : Number(orderData.shippingCost) || 0,
      promoCode: (pricing ? pricing.promoCode : orderData.promoCode?.trim()) || undefined,
      discountAmount: promoDiscount || 0,
      codFee: pricing ? pricing.codFee : Number(orderData.codFee) || 0,
      status: 'pending',
      notes: orderData.notes?.trim() || undefined,
      orderDate: new Date(),
      // Stored so the unique index can refuse a repeat of this same attempt.
      // Left undefined rather than null when absent, so the sparse index keeps
      // ignoring the orders that carry none.
      clientOrderId: orderData.clientOrderId || undefined
    };



    // The promo is NOT appended to `notes` any more. It was being written into
    // the customer's own free-text field while already being stored properly in
    // `promoCode` and `discountAmount` — two sources of truth for one fact, and
    // the customer's note silently rewritten underneath them.

    // 🔥 CRITICAL: Delegate Database Write and Stock Mutation to Service Tier!
    logger.info('🔍 Booting Mongoose Transaction payload...');
    let savedOrder: any;

    if (MONGO_BYPASS) {
      const fallbackId = `ORD-FB-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      savedOrder = {
        ...newOrder,
        orderId: fallbackId,
        _id: fallbackId,
        createdAt: new Date(),
        orderDate: new Date(),
      };
    } else {
      const txResult = await createOrderTransaction(orderData, newOrder, pricing?.promoCode);

      // Two requests for the same attempt raced each other and this one lost.
      // Its transaction aborted whole, so nothing is reserved; the winner's
      // order is the customer's order.
      if (!txResult.success && 'duplicate' in txResult && txResult.duplicate) {
        const alreadyPlaced = await findOrderByClientId(orderData.clientOrderId);
        if (alreadyPlaced) {
          return NextResponse.json({
            success: true,
            order: orderResponsePayload(alreadyPlaced),
            message: 'Order placed successfully!'
          });
        }
      }

      if (!txResult.success) {
        return NextResponse.json(
          { success: false, error: txResult.error || 'Failed to process order. Stock may fall short.' },
          { status: 400 }
        );
      }
      savedOrder = txResult.savedOrder;
    }

    // 📊 The funnel's Purchase event — the order is committed, so this is true.
    //
    // Awaited, not fire-and-forget. Netlify kills the function the instant it
    // responds, so a detached promise here would lose revenue events under
    // exactly the load that makes them worth having. It is one insert on an
    // indexed collection; the milliseconds are worth the certainty.
    //
    // Wrapped so it can never fail the order. The customer has paid and the
    // stock is reserved — a measurement failure at this point is a line in a
    // log, never a 500 handed to someone who has already bought something.
    if (!MONGO_BYPASS) {
      try {
        await recordPurchase(savedOrder, orderData.sessionId);
      } catch (analyticsError) {
        logger.error('📉 Could not record the Purchase event', analyticsError);
      }
    }

    // 📧 Background Post-Processing (Fire and Forget! 0 blocking time)
    logger.info('🚀 Dispatching Background Hooks...');
    // Must await — Netlify serverless kills fire-and-forget promises instantly after response
    // Safe: MONGO_BYPASS guards skip all DB calls, so this only waits for Brevo SMTP (~2-3s)
    await dispatchOrderPostProcessing(savedOrder, orderData);

    // Return success response with order details instantly
    return NextResponse.json({
      success: true,
      order: orderResponsePayload(savedOrder),
      message: 'Order placed successfully!'
    });

  } catch (error: any) {
    // Handle specific MongoDB errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order processing failed due to duplicate order ID. Please try again.'
        },
        { status: 500 }
      );
    }

    // Handle connection errors
    if (error && typeof error === 'object' && 'name' in error &&
      (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection error. Please try again.'
        },
        { status: 500 }
      );
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      // Provide more specific error messages
      const mongoError = error as any; // Type assertion for MongoDB error
      const validationErrors = Object.values(mongoError.errors).map((err: any) => err.message);
      return NextResponse.json(
        {
          success: false,
          error: `Validation failed: ${validationErrors.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Never hand the raw error text to the customer — it is internal wording at
    // best and leaks implementation detail at worst. Log it in full, answer with
    // something they can act on.
    logger.error('❌ Unhandled error while placing an order', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Something went wrong placing your order. Please try again, or contact us if it keeps happening.'
      },
      { status: 500 }
    );
  }
}

/** Regex-special characters, so a customer searching for "a+b" is not a syntax error. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds the MongoDB filter for the admin order list.
 *
 * One search box across the four things an admin actually has in hand when a
 * customer rings: the order number, their name, their phone, or their email.
 *
 * Order id, phone and email are anchored with `^` so each can use its index —
 * those are the three you paste in whole. Name is deliberately unanchored,
 * because "find me the Ahmed who ordered yesterday" is the common case and an
 * anchored match would not find "Mohamed Ahmed". That one branch makes the $or
 * a scan; it stays bounded by the page limit, and the note in order/model.ts
 * records what to do if it ever stops being cheap.
 */
function buildOrderFilter(search?: string, status?: string) {
  const filter: Record<string, unknown> = {};

  if (status) filter.status = status;

  if (search) {
    const safe = escapeRegex(search);
    filter.$or = [
      { orderId: { $regex: `^${safe}`, $options: 'i' } },
      { 'customer.phone': { $regex: `^${safe}` } },
      { 'customer.email': { $regex: `^${safe}`, $options: 'i' } },
      { 'customer.name': { $regex: safe, $options: 'i' } },
    ];
  }

  return filter;
}

// GET - Fetch orders for admin (optional, for admin dashboard)
export async function GET(request: NextRequest) {
  if (process.env.MONGO_BYPASS === 'true') {
    return NextResponse.json({
      success: true,
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
      orders: [],
      _notice: 'Database is currently in maintenance mode.'
    });
  }

  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    // After the move, the order book is the dashboard's (decision 16 Oct 2026).
    if (sellsFromSupabase()) return movedToDashboard('Shop orders');
    await dbConnect();

    // `.catch()` on every field means a nonsense query string degrades to the
    // default rather than producing `skip: NaN` (which is what `?page=abc` used
    // to do) or an unbounded result set (`?limit=999999`, which returned every
    // customer's name, email, phone and address in one response).
    const url = new URL(request.url);
    const { page, limit, search, status, sortBy, sortDir } = listOrdersQuerySchema.parse(
      Object.fromEntries(url.searchParams)
    );
    const skip = (page - 1) * limit;

    // Search and status filtering run in the DATABASE, across every order.
    // They used to run in the browser over the 50 rows already on screen, so
    // searching for a customer on page 3 confidently reported "no orders match".
    const filter = buildOrderFilter(search, status);

    const { orders, totalCount } = await orderQueries.listPage(filter, {
      skip,
      limit,
      sortBy,
      sortDir,
    });

    return NextResponse.json({
      success: true,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      currentPage: page,
      orders: orders.map(order => ({
        // `.lean()` returns a raw ObjectId; the client uses this as a string in
        // the delete and status-update URLs.
        _id: String(order._id),
        orderId: order.orderId,
        customer: order.customer,
        products: order.products,
        paymentMethod: order.paymentMethod,
        promoCode: order.promoCode,
        discountAmount: order.discountAmount,
        transactionScreenshot: order.transactionScreenshot,
        totalAmount: order.totalAmount,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        status: order.status,
        orderDate: order.orderDate,
        createdAt: order.createdAt,
        notes: order.notes
      }))
    });

  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders'
      },
      { status: 500 }
    );
  }
}

/**
 * Checkout after the move. The answers are the same as the MongoDB path's —
 * the same order shape, the same 409s for a changed price or promo — so the
 * checkout page cannot tell which database took the order.
 */
async function placeThroughSupabase(orderData: any): Promise<NextResponse> {
  const result = await placeOrder(orderData, resolveVariantName);
  if (!result.ok) return NextResponse.json(result.body, { status: result.status });

  const savedOrder = result.order;
  // The funnel's Purchase event: analytics stays where it is (MongoDB).
  try {
    await recordPurchase(savedOrder, orderData.sessionId);
  } catch (analyticsError) {
    logger.error('📉 Could not record the Purchase event', analyticsError);
  }
  // The emails, inline as before; the outbox row the door wrote is the
  // safety net the drain picks up if this does not finish.
  await dispatchOrderPostProcessing(savedOrder, orderData);

  return NextResponse.json({
    success: true,
    order: orderResponsePayload(savedOrder),
    message: 'Order placed successfully!',
  });
}
