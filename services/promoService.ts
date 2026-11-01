import { ClientSession } from 'mongoose';
import dbConnect from '../lib/mongodb';
import Promo from '../models/promo';

/** Midnight of the given date, so two dates compare as calendar days. */
function startOfDay(value: Date | string): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Whether a code's campaign window covers today.
 *
 * Compared by calendar day rather than by instant, so a code starting today
 * works from the first minute of the day and one expiring today works until the
 * last.
 */
function windowError(promo: { startsAt?: Date; expiresAt?: Date }): string | null {
  const today = startOfDay(new Date());

  if (promo.startsAt && today < startOfDay(promo.startsAt)) {
    return 'Promo code is not active yet';
  }
  if (promo.expiresAt && today > startOfDay(promo.expiresAt)) {
    return 'Promo code has expired';
  }
  return null;
}

/** What this code takes off an order of `orderTotal`, respecting any cap. */
function discountFor(
  promo: { discountType: string; discountValue: number; maximumDiscount?: number },
  orderTotal: number
): number {
  if (promo.discountType !== 'percentage') {
    return promo.discountValue;
  }

  const raw = (orderTotal * promo.discountValue) / 100;
  return promo.maximumDiscount ? Math.min(raw, promo.maximumDiscount) : raw;
}

/**
 * Checks whether a code may be used on an order of `orderTotal`, and works out
 * what it takes off.
 *
 * Read-only — it claims nothing. `incrementPromoUsage` is what actually consumes
 * a use, and it re-checks the limit atomically, because any number of orders can
 * commit between a customer seeing "code applied" and pressing Buy.
 */
export async function validatePromo(code: string, orderTotal: number) {
  if (!code || !code.trim()) {
    return { success: false, error: 'Promo code is required' };
  }

  await dbConnect();

  const promoCode = await Promo.findOne({
    code: code.toUpperCase().trim(),
    isActive: true
  });

  if (!promoCode) {
    return { success: false, error: 'Invalid promo code' };
  }

  const outsideWindow = windowError(promoCode);
  if (outsideWindow) {
    return { success: false, error: outsideWindow };
  }

  if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
    return { success: false, error: 'Promo code usage limit exceeded' };
  }

  if (promoCode.minimumOrder && orderTotal < promoCode.minimumOrder) {
    return { success: false, error: `Minimum order of L.E ${promoCode.minimumOrder} required` };
  }

  const discount = discountFor(promoCode, orderTotal);

  return {
    success: true,
    promo: {
      code: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      discount: discount,
      description: promoCode.description,
      waiveShipping: promoCode.waiveShipping || false
    }
  };
}

/**
 * Raised when a code's usage limit was reached before this order could claim it.
 *
 * Typed so the order transaction can tell "the last use was taken a moment ago"
 * apart from a genuine failure, and answer the customer accordingly.
 */
export class PromoLimitError extends Error {
  constructor(public readonly code: string) {
    super(`Promo code ${code} has reached its usage limit.`);
    this.name = 'PromoLimitError';
  }
}

/** Raised when this customer has already used the code as often as allowed. */
export class PromoCustomerLimitError extends Error {
  constructor(public readonly code: string) {
    super(`You have already used promo code "${code}" the maximum number of times.`);
    this.name = 'PromoCustomerLimitError';
  }
}

/**
 * Egyptian numbers arrive as 01…, +201… or 201…. The last ten digits are the
 * same in all three, so that is what identifies a customer.
 */
function phoneTail(phone: string): string {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Refuses the order if this phone number has used the code `perCustomerLimit`
 * times already (30 Oct 2026). Codes without the field are not limited per
 * customer. Runs in the order's transaction, before the use is claimed.
 *
 * Deleted orders do not count: deleting gives the use back, like the stock.
 * `excludeOrderId` is the order being placed: the transaction has already
 * written it, and it must not count against its own customer.
 */
export async function assertPerCustomerLimit(
  code: string,
  phone: string,
  session?: ClientSession,
  excludeOrderId?: unknown
) {
  await dbConnect();

  const normalised = code.toUpperCase().trim();
  const promo = await Promo.findOne({ code: normalised }, { perCustomerLimit: 1 }).session(session ?? null).lean<{ perCustomerLimit?: number | null }>();
  const limit = promo?.perCustomerLimit;
  if (!limit) return;

  const tail = phoneTail(phone);
  if (tail.length < 10) return; // the order schema already requires a phone; never guess

  const Order = (await import('@/order/model')).default;
  const used = await Order.countDocuments(
    {
      promoCode: normalised,
      'customer.phone': { $regex: `${escapeRegex(tail)}$` },
      ...(excludeOrderId ? { _id: { $ne: excludeOrderId } } : {}),
    },
    { session: session ?? undefined }
  );

  if (used >= limit) throw new PromoCustomerLimitError(normalised);
}

/**
 * Claims one use of a promo code.
 *
 * The limit is enforced INSIDE the update, not by reading the count first and
 * writing second. `$expr: { $lt: ["$usedCount", "$usageLimit"] }` makes MongoDB
 * check and increment in one indivisible step, so two customers racing for the
 * last use cannot both win.
 *
 * Checking at validation time is not enough on its own: validation happens while
 * the customer is still filling in the form, and any number of other orders can
 * commit in the meantime.
 *
 * Pass the order's `session` so the claim commits or rolls back together with
 * the order itself — a cancelled order must not consume a use.
 */
export async function incrementPromoUsage(code: string, session?: ClientSession) {
  await dbConnect();

  const normalised = code.toUpperCase().trim();

  const updatedPromo = await Promo.findOneAndUpdate(
    {
      code: normalised,
      $or: [
        { usageLimit: { $exists: false } },
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
      ]
    },
    { $inc: { usedCount: 1 } },
    { session, new: true }
  );

  if (!updatedPromo) {
    throw new PromoLimitError(normalised);
  }

  return updatedPromo;
}

/**
 * Returns one use of a promo code to the campaign.
 *
 * The mirror of `incrementPromoUsage`, for when an order that claimed a use is
 * cancelled or deleted. Without this, `usedCount` only ever goes up: a campaign
 * limited to 100 uses is silently eaten by cancelled orders and shuts off early,
 * with nothing logged and nothing thrown.
 *
 * Deliberately never throws, and never fails the caller — the same rule
 * `releaseStock` follows. A cancellation must always be able to complete, so a
 * code that has since been deleted or renamed is reported loudly and skipped
 * rather than blocking the cancellation.
 *
 * `usedCount: { $gt: 0 }` is what keeps the count from going negative, checked
 * inside the update rather than by reading first and writing second.
 */
export async function releasePromoUsage(code: string | undefined, session?: ClientSession) {
  if (!code || !code.trim()) return null;

  await dbConnect();

  const normalised = code.toUpperCase().trim();

  const updatedPromo = await Promo.findOneAndUpdate(
    { code: normalised, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } },
    { session, new: true }
  );

  if (!updatedPromo) {
    console.warn(
      `⚠️ [promo] Could not return a use of "${normalised}" — the code no longer exists, or its count is already 0. Nothing changed.`
    );
    return null;
  }

  return updatedPromo;
}
