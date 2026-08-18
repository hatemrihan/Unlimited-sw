import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import {
  issueAdminCookie,
  passwordMatches,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE_SECONDS,
} from '@/login/adminCookie';
import { clientKey, checkLock, recordFailure, clearFailures } from "@/login/rateLimit";

/**
 * The emergency admin door — password in, signed cookie out.
 *
 * Deliberately public: it IS the login, so requiring a session to use it would
 * be a deadlock. Everything protecting it therefore has to live in here:
 *
 *   - a lockout after repeated failures, shared across instances via MongoDB;
 *   - a constant-time password comparison;
 *   - a signed, server-verified cookie that is NOT the server's secret;
 *   - a log line for every use, because this door cannot say who walked through it.
 *
 * Normal sign-in is Google (/admin/login). This exists only for the day that
 * cannot be used.
 */

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const cookieSecret = process.env.ADMIN_COOKIE_SECRET;

  if (!adminPassword || !cookieSecret) {
    logger.error('[admin-auth] ADMIN_PASSWORD or ADMIN_COOKIE_SECRET is not configured');
    return NextResponse.json(
      { success: false, error: 'Password sign-in is not available.' },
      { status: 503 }
    );
  }

  const key = clientKey(request.headers);

  const lock = await checkLock(key);
  if (lock.locked) {
    logger.warn('[admin-auth] Locked out client attempted sign-in', {
      retryAfterSeconds: lock.retryAfterSeconds,
    });
    return NextResponse.json(
      {
        success: false,
        error: `Too many failed attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).`,
      },
      { status: 429, headers: { 'Retry-After': String(lock.retryAfterSeconds) } }
    );
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  if (!passwordMatches(password, adminPassword)) {
    const state = await recordFailure(key);
    logger.warn('[admin-auth] Failed password attempt', {
      remainingAttempts: state.remainingAttempts,
      lockedOut: state.locked,
    });

    // The response says the same thing whether or not the client is now locked,
    // beyond the status code — no free information about how close they are.
    return NextResponse.json(
      {
        success: false,
        error: state.locked
          ? `Too many failed attempts. Try again in ${Math.ceil(state.retryAfterSeconds / 60)} minute(s).`
          : 'Invalid password',
      },
      { status: state.locked ? 429 : 401 }
    );
  }

  await clearFailures(key);

  const cookieValue = await issueAdminCookie(cookieSecret);
  if (!cookieValue) {
    return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
  }

  // This door cannot identify a person, so the log is the only record that it
  // was used at all.
  logger.warn('[admin-auth] Emergency password sign-in succeeded', { at: new Date().toISOString() });

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });

  return response;
}

/** Sign out of the emergency door. */
export async function DELETE(_request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}

