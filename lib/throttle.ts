import dbConnect from '@/lib/mongodb';
import RequestCounter from '@/models/requestCounter';

/**
 * A fixed-window throttle for public endpoints.
 *
 * `POST /api/orders` had no limit of any kind: every attempt opened a MongoDB
 * transaction, reserved stock and sent mail over SMTP, and a script could fire
 * them as fast as the network allowed.
 *
 * This is a brake on scripted abuse, not a security control — `x-forwarded-for`
 * can be spoofed, exactly as noted for the admin lockout. What actually protects
 * an order is the server-side pricing, the stock transaction and validation.
 */

export interface ThrottleResult {
  allowed: boolean;
  /** Requests left in the current window. */
  remaining: number;
  /** Seconds until the window rolls over. Only meaningful when refused. */
  retryAfterSeconds: number;
}

export interface ThrottleOptions {
  limit: number;
  windowMs: number;
}

/**
 * Identifies the client behind Netlify's proxy.
 *
 * `x-forwarded-for` can carry a list; the FIRST entry is the original client.
 * Mirrors login/rateLimit.ts so both read the client the same way.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-nf-client-connection-ip') || headers.get('x-real-ip') || 'unknown';
}

/**
 * Counts one request against `key` and says whether it may proceed.
 *
 * The whole read-reset-increment is a single atomic pipeline update, so two
 * requests arriving together cannot both read the same count and both pass.
 *
 * Fails OPEN: if the counter itself cannot be reached, the request is allowed.
 * A database hiccup must never stop customers ordering — refusing real sales to
 * enforce a rate limit is a worse outcome than the abuse it guards against.
 */
export async function consumeRateLimit(
  key: string,
  { limit, windowMs }: ThrottleOptions,
  now: Date = new Date()
): Promise<ThrottleResult> {
  try {
    await dbConnect();

    const windowStart = new Date(now.getTime() - windowMs);

    // `$cond` on windowStartedAt: start a fresh window if the old one has
    // expired (or there is no record yet), otherwise add to the current one.
    const isExpired = {
      $or: [
        { $eq: [{ $type: '$windowStartedAt' }, 'missing'] },
        { $lt: ['$windowStartedAt', windowStart] },
      ],
    };

    const updated = await RequestCounter.findOneAndUpdate(
      { key },
      [
        {
          $set: {
            windowStartedAt: { $cond: [isExpired, now, '$windowStartedAt'] },
            count: { $cond: [isExpired, 1, { $add: [{ $ifNull: ['$count', 0] }, 1] }] },
          },
        },
      ],
      { upsert: true, new: true }
    );

    const count = updated?.count ?? 1;
    const startedAt = updated?.windowStartedAt ?? now;
    const resetAt = new Date(new Date(startedAt).getTime() + windowMs);

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000)),
    };
  } catch (error) {
    console.warn('⚠️ [throttle] Could not count this request; allowing it through.', error);
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}
