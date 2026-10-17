import { sendOrderConfirmationEmail, sendAdminNotificationEmail } from '../email';
import { orderEmailDataFrom } from '../email/fromOrder';
import Notification from '../models/notification';
import { productQueries } from '@/product/queries';
import { logger } from '../utils/logger';
import { resolveVariantName } from './orderCreationService';
import { markEmailSent } from './pendingEmailService';
import { sellsFromSupabase } from '@/shopdb/client';
import { markShopEmailSent } from '@/shopdb/orders';

/** Remaining units at or below this trigger a 'stock' notification for the admin. */
const LOW_STOCK_THRESHOLD = 3;

/**
 * Emits a 'stock' notification for every line whose remaining stock just crossed
 * the low-stock threshold. The Notification model has always had a 'stock' type
 * and the admin UI already renders it — nothing ever created one.
 */
async function createLowStockNotifications(stockLevels: any[]) {
  const low = stockLevels.filter(
    level => typeof level.remainingStock === 'number' && level.remainingStock <= LOW_STOCK_THRESHOLD
  );

  for (const level of low) {
    const label = level.variantName ? `${level.productName} (${level.variantName})` : level.productName;
    await Notification.create({
      type: 'stock',
      title: level.remainingStock <= 0 ? `Out of stock: ${label}` : `Low stock: ${label}`,
      message:
        level.remainingStock <= 0
          ? `${label} is now out of stock.`
          : `${label} has only ${level.remainingStock} left.`,
      data: {
        productName: level.productName,
        variantName: level.variantName,
        remainingStock: level.remainingStock,
        threshold: LOW_STOCK_THRESHOLD,
      },
    });
  }
}

/**
 * How long the customer may be kept waiting for the confirmation email.
 *
 * Brevo usually answers in two or three seconds, but "usually" is not a
 * guarantee and an SMTP provider having a bad afternoon must not become a
 * checkout that hangs. Four seconds is past the normal case and well short of
 * the point where a customer on a phone decides the button is broken and
 * presses it again.
 */
const POST_PROCESSING_BUDGET_MS = 4000;

/**
 * Handles all peripheral asynchronous events triggered post-Order creation.
 *
 * Awaited by the order route rather than fired and forgotten, because Netlify
 * kills a serverless function the moment it responds and a detached promise
 * dies with it — the customer would simply never get their email.
 *
 * So it is awaited, but not indefinitely. The order is already committed by the
 * time this runs; the email is a courtesy, and no courtesy is worth holding a
 * paid-for order's response open behind a third party. Past the budget the
 * response goes out and the send is left running for whatever time the
 * platform still gives it.
 *
 * The miss is logged loudly and deliberately: it is the only signal that a
 * customer may be sitting without a confirmation, and it is what tells you the
 * durable queue is now worth building.
 */
export function dispatchOrderPostProcessing(savedOrder: any, orderData: any) {
  const work = processAsyncRoutines(savedOrder, orderData)
    .then(async () => {
      // Take this order off the queue. The row was written inside the order's
      // own transaction, so if this line is never reached — a timeout, a crash,
      // a provider outage — the scheduled drain picks it up instead. The
      // customer gets their email late rather than never.
      //
      // After the move the owed email is a row in Supabase's shop_email_outbox
      // (written by place_shop_order), keyed by the order's uuid.
      if (sellsFromSupabase()) await markShopEmailSent(savedOrder._id);
      else await markEmailSent(savedOrder.orderId);
    })
    .catch(err => {
      logger.error(`❌ Email dispatch failed for order ${savedOrder.orderId}:`, err);
      // Deliberately NOT marked sent, and deliberately not rethrown: the order
      // is already committed and the customer must still be answered. The row
      // stays pending and the drain will try again.
    });

  return withTimeBudget(work, POST_PROCESSING_BUDGET_MS, () => {
    logger.warn(
      `⏱️ Post-order processing for ${savedOrder.orderId} exceeded ${POST_PROCESSING_BUDGET_MS}ms — answering the customer now. The confirmation email may not have been sent.`
    );
  });
}

/**
 * Waits for `work`, but not longer than `budgetMs`.
 *
 * Exported so the budget can be tested on its own. Testing it through
 * `dispatchOrderPostProcessing` would mean standing up the whole email
 * pipeline to observe one race, which tests the pipeline rather than the rule.
 *
 * The work is NOT cancelled on timeout — it cannot be, and should not be. The
 * send may well still succeed in whatever time the platform allows; all that
 * ends is the customer's wait.
 */
export function withTimeBudget(
  work: Promise<unknown>,
  budgetMs: number,
  onExceeded: () => void
): Promise<void> {
  let timer: ReturnType<typeof setTimeout>;

  const budget = new Promise<'timeout'>(resolve => {
    timer = setTimeout(() => resolve('timeout'), budgetMs);
    // Never hold the process open for the timer alone.
    if (typeof timer === 'object' && typeof timer.unref === 'function') timer.unref();
  });

  return Promise.race([work.then(() => 'done' as const), budget]).then(outcome => {
    clearTimeout(timer);
    if (outcome === 'timeout') onExceeded();
  });
}

// Internal execution queue mapped below API response boundaries
async function processAsyncRoutines(savedOrder: any, orderData: any) {
  // 1. Compile Internal Analytics/Notifications First
  if (process.env.MONGO_BYPASS !== 'true') {
    try {
        const stockLevels = [];
        const productIds = orderData.products.map((p: any) => p.productId);
        const productsList = await productQueries.findByIds(productIds);
        const productMap = new Map(productsList.map((p: any) => [p._id.toString(), p]));

        for (const orderProduct of orderData.products) {
          const product = productMap.get(orderProduct.productId?.toString());
          if (product) {
            if (product.variants && product.variants.length > 0) {
              const orderedVariantName = resolveVariantName(orderProduct);
              const variant = product.variants.find((v: any) => v.name === orderedVariantName);
              if (variant) {
                stockLevels.push({
                  productName: product.name,
                  variantName: variant.name,
                  remainingStock: variant.stock,
                  totalStock: product.stock
                });
              }
            } else {
              stockLevels.push({
                productName: product.name,
                remainingStock: product.stock
              });
            }
          }
        }

        await createLowStockNotifications(stockLevels);

        await Notification.create({
          type: 'order',
          title: `New Order #${savedOrder.orderId}`,
          message: `User ${savedOrder.customer.name} made an order for ${savedOrder.products.length} item(s). Total: L.E ${savedOrder.totalAmount}`,
          data: {
            orderId: savedOrder.orderId,
            customerName: savedOrder.customer.name,
            customerEmail: savedOrder.customer.email,
            totalAmount: savedOrder.totalAmount,
            productCount: savedOrder.products.length,
            stockLevels: stockLevels,
            paymentMethod: savedOrder.paymentMethod
          }
        });
    } catch(notificationError) { 
        logger.error('Notification queue failed', notificationError) 
    }
  }

  // 2. Dispatch Bulk Nodemailer Events
  await sendOrderEmails(savedOrder, orderData);
}

/**
 * Sends the customer's confirmation and the team's notification.
 *
 * Throws when the CUSTOMER's email fails, and only then. That distinction is
 * what makes the queue work: the caller marks an order done when this resolves,
 * so swallowing the failure — as this code used to, logging and returning
 * normally — would file the order as "email sent" and the customer would never
 * hear anything.
 *
 * A failed ADMIN notification is logged and tolerated. Retrying the pair for
 * its sake would re-send the customer an email they already have, which is a
 * worse outcome than the team reading the log.
 */
export async function sendOrderEmails(savedOrder: any, orderData: any) {
  const emailData = orderEmailDataFrom(savedOrder, orderData);

  // Both are attempted even if one fails — a failed customer mail must not
  // stop the team being told an order came in, and vice versa.
  const [customerResult, adminResult] = await Promise.all([
    sendOrderConfirmationEmail(emailData),
    sendAdminNotificationEmail(emailData)
  ]);

  if (!adminResult.success) {
    logger.error(`Admin notification failed for order ${savedOrder.orderId}`, adminResult.error);
  }

  if (!customerResult.success) {
    logger.error(`Customer confirmation failed for order ${savedOrder.orderId}`, customerResult.error);
    throw new Error(
      `Customer confirmation email failed for order ${savedOrder.orderId}: ${customerResult.error ?? 'unknown error'}`
    );
  }
}

/**
 * Re-sends the emails for one queued order.
 *
 * Only the emails. `processAsyncRoutines` also writes the admin's in-app
 * notification and the low-stock warnings, and those already ran when the order
 * was placed — replaying them would fill the admin's notification list with
 * copies of an order they were told about an hour ago.
 */
export async function sendQueuedOrderEmail(payload: {
  order: Record<string, unknown>;
  orderData: Record<string, unknown>;
}) {
  await sendOrderEmails(payload.order, payload.orderData);
}
