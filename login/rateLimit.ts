import dbConnect from '@/lib/mongodb';
import LoginAttempt from '@/models/loginAttempt';

/**
 * Lockout for the admin password door.
 *
 * Before this, `POST /api/admin/auth` accepted unlimited guesses at whatever
 * speed a script could send them — one password, no delay, no lockout, and no
 * record that anyone had tried.
 */

export const MAX_FAILURES = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_MS = 15 * 60 * 1000; // failures older than this no longer count

export interface LockState {
  locked: boolean;
  /** Seconds until the client may try again. Only meaningful when locked. */
  retryAfterSeconds: number;
  remainingAttempts: number;
}

/**
 * Identifies the client behind Netlify's proxy.
 *
 * `x-forwarded-for` can carry a list; the FIRST entry is the original client.
 * This is best-effort — an attacker can spoof the header — so it is a brake on
 * casual guessing, not a guarantee. The signed cookie and a strong password are
 * what actually protect the door.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-nf-client-connection-ip') || headers.get('x-real-ip') || 'unknown';
}

/** Whether this client is currently locked out. Records nothing. */
export async function checkLock(key: string, now = new Date()): Promise<LockState> {
  await dbConnect();

  const record = await LoginAttempt.findOne({ key }).lean<{
    failedCount: number;
    firstFailedAt: Date;
    lockedUntil?: Date;
  }>();

  if (!record) {
    return { locked: false, retryAfterSeconds: 0, remainingAttempts: MAX_FAILURES };
  }

  if (record.lockedUntil && record.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 1000),
      remainingAttempts: 0,
    };
  }

  // Failures from before the window no longer count against the client.
  const withinWindow = now.getTime() - new Date(record.firstFailedAt).getTime() < WINDOW_MS;
  const failures = withinWindow ? record.failedCount : 0;

  return {
    locked: false,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, MAX_FAILURES - failures),
  };
}

/** Records a failed attempt and locks the client once the limit is reached. */
export async function recordFailure(key: string, now = new Date()): Promise<LockState> {
  await dbConnect();

  const existing = await LoginAttempt.findOne({ key });
  const withinWindow =
    existing && now.getTime() - new Date(existing.firstFailedAt).getTime() < WINDOW_MS;

  const failedCount = withinWindow ? existing.failedCount + 1 : 1;
  const lockedUntil =
    failedCount >= MAX_FAILURES ? new Date(now.getTime() + LOCK_DURATION_MS) : undefined;

  await LoginAttempt.findOneAndUpdate(
    { key },
    {
      key,
      failedCount,
      firstFailedAt: withinWindow ? existing.firstFailedAt : now,
      ...(lockedUntil ? { lockedUntil } : { $unset: { lockedUntil: 1 } }),
    },
    { upsert: true, new: true }
  );

  return {
    locked: Boolean(lockedUntil),
    retryAfterSeconds: lockedUntil ? Math.ceil(LOCK_DURATION_MS / 1000) : 0,
    remainingAttempts: Math.max(0, MAX_FAILURES - failedCount),
  };
}

/** Clears a client's history after a successful sign-in. */
export async function clearFailures(key: string): Promise<void> {
  await dbConnect();
  await LoginAttempt.deleteOne({ key });
}
