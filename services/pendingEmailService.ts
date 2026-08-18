import { ClientSession } from 'mongoose';
import dbConnect from '../lib/mongodb';
import PendingEmail from '../models/pendingEmail';
import { logger } from '../utils/logger';

/**
 * How many times a send is retried before it is left alone.
 *
 * Five attempts across the backoff below spans a little over an hour. Past
 * that the failure is not transient — a bad address, a suspended account, a
 * template that throws — and retrying forever only buries the one row somebody
 * needs to look at.
 */
export const MAX_ATTEMPTS = 5;

/**
 * Wait after each failed attempt, in minutes.
 *
 * Front-loaded, because most failures are a provider blip that clears in
 * seconds, and stretched afterwards so a genuine outage is not hammered.
 */
const BACKOFF_MINUTES = [1, 5, 15, 30, 60];

function nextAttemptAfter(attempts: number, now: Date): Date {
  const wait = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length - 1)];
  return new Date(now.getTime() + wait * 60_000);
}

/**
 * Records that an order owes its customer an email.
 *
 * Called with the order's own session so it commits with the order — see the
 * comment on the model for why that atomicity is the whole point.
 */
export async function enqueueOrderEmail(
  orderId: string,
  payload: { order: Record<string, unknown>; orderData: Record<string, unknown> },
  session?: ClientSession
) {
  const [row] = await PendingEmail.create([{ orderId, payload }], session ? { session } : {});
  return row;
}

/** Marks the work done. Idempotent — a second call on a sent row changes nothing. */
export async function markEmailSent(orderId: string) {
  await dbConnect();
  return PendingEmail.findOneAndUpdate(
    { orderId, status: 'pending' },
    { status: 'sent', sentAt: new Date(), lastError: undefined },
    { new: true }
  );
}

/**
 * Claims one due item, atomically.
 *
 * The claim and the backoff happen in a single `findOneAndUpdate`, so two
 * drains running at once — a scheduled run overlapping a slow previous one —
 * cannot both take the same row and send the same customer two emails. This is
 * the same reasoning as `incrementPromoUsage`: check and write in one step, or
 * do not bother checking.
 */
export async function claimNextPendingEmail(now: Date = new Date()) {
  await dbConnect();

  return PendingEmail.findOneAndUpdate(
    { status: 'pending', nextAttemptAt: { $lte: now } },
    {
      $inc: { attempts: 1 },
      $set: { nextAttemptAt: nextAttemptAfter(0, now) },
    },
    { sort: { nextAttemptAt: 1 }, new: true }
  );
}

/** Records a failed attempt, and gives up once the attempts are spent. */
export async function recordEmailFailure(orderId: string, error: unknown, now: Date = new Date()) {
  await dbConnect();

  const message = error instanceof Error ? error.message : String(error);
  const row = await PendingEmail.findOne({ orderId });
  if (!row) return null;

  const exhausted = row.attempts >= MAX_ATTEMPTS;

  row.status = exhausted ? 'abandoned' : 'pending';
  row.lastError = message;
  row.nextAttemptAt = nextAttemptAfter(row.attempts, now);
  await row.save();

  if (exhausted) {
    // Loud on purpose. This is a customer who paid and will never hear from
    // us unless a person does something about it.
    logger.error(
      `📪 Giving up on the confirmation email for order ${orderId} after ${row.attempts} attempts. Last error: ${message}`
    );
  }

  return row;
}

/**
 * Works through the emails that are due.
 *
 * `send` is passed in rather than imported so this can be tested without
 * standing up SMTP, and so the drain does not import the whole email stack
 * just to be scheduled.
 */
export async function drainPendingEmails(
  send: (payload: IPendingEmailPayload) => Promise<void>,
  { limit = 25, now = new Date() }: { limit?: number; now?: Date } = {}
) {
  await dbConnect();

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < limit; i++) {
    const row = await claimNextPendingEmail(now);
    if (!row) break;

    try {
      await send(row.payload as IPendingEmailPayload);
      await markEmailSent(row.orderId);
      sent++;
    } catch (error) {
      await recordEmailFailure(row.orderId, error, now);
      failed++;
    }
  }

  if (sent > 0 || failed > 0) {
    logger.info(`📬 Drained pending emails — ${sent} sent, ${failed} failed.`);
  }

  return { sent, failed };
}

export interface IPendingEmailPayload {
  order: Record<string, unknown>;
  orderData: Record<string, unknown>;
}
