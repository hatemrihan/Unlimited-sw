import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '../../../../lib/withDb';
import { requireAdmin } from '../../../../lib/requireAdmin';
import { invalidateFreeShippingCache } from '../../../../lib/cache';
import FreeShippingOverride, { type IFreeShippingOverride } from '../../../../models/freeShippingOverride';

/**
 * Admin API for the global free-shipping override.
 *
 * GET  → current state
 * PUT  → toggle on/off with expiry
 */

export const GET = withDb(async (_request: NextRequest) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  const doc = await FreeShippingOverride.findOne({ key: 'global' }).lean() as IFreeShippingOverride | null;

  if (!doc) {
    return NextResponse.json({
      success: true,
      freeShipping: {
        enabled: false,
        expiresAt: null,
        enabledBy: null,
        enabledAt: null,
      },
    });
  }

  // Auto-expire check — keep the admin UI honest
  const now = new Date();
  const isExpired = doc.expiresAt && new Date(doc.expiresAt) <= now;

  if (doc.enabled && isExpired) {
    await FreeShippingOverride.updateOne(
      { key: 'global' },
      { $set: { enabled: false } }
    );
    invalidateFreeShippingCache();
  }

  return NextResponse.json({
    success: true,
    freeShipping: {
      enabled: doc.enabled && !isExpired,
      expiresAt: doc.expiresAt,
      enabledBy: doc.enabledBy,
      enabledAt: doc.enabledAt,
    },
  });
});

/** Maximum toggle duration: 30 days. */
const MAX_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export const PUT = withDb(async (request: NextRequest) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await request.json();
  const { enabled, expiresAt, enabledBy } = body;

  // ── Turning OFF ──────────────────────────────────────────────────────
  if (enabled === false) {
    await FreeShippingOverride.updateOne(
      { key: 'global' },
      { $set: { enabled: false } },
      { upsert: true }
    );
    invalidateFreeShippingCache();

    return NextResponse.json({
      success: true,
      message: 'Free shipping disabled.',
    });
  }

  // ── Turning ON ───────────────────────────────────────────────────────
  if (!expiresAt) {
    return NextResponse.json(
      { success: false, error: 'expiresAt is required when enabling free shipping.' },
      { status: 400 }
    );
  }

  const expiry = new Date(expiresAt);
  const now = new Date();

  if (isNaN(expiry.getTime())) {
    return NextResponse.json(
      { success: false, error: 'Invalid date format for expiresAt.' },
      { status: 400 }
    );
  }

  if (expiry <= now) {
    return NextResponse.json(
      { success: false, error: 'expiresAt must be in the future.' },
      { status: 400 }
    );
  }

  if (expiry.getTime() - now.getTime() > MAX_DURATION_MS) {
    return NextResponse.json(
      { success: false, error: 'Maximum duration is 30 days.' },
      { status: 400 }
    );
  }

  await FreeShippingOverride.updateOne(
    { key: 'global' },
    {
      $set: {
        enabled: true,
        expiresAt: expiry,
        enabledBy: enabledBy || 'admin',
        enabledAt: now,
      },
    },
    { upsert: true }
  );

  invalidateFreeShippingCache();

  return NextResponse.json({
    success: true,
    message: `Free shipping enabled until ${expiry.toISOString()}.`,
    freeShipping: {
      enabled: true,
      expiresAt: expiry,
      enabledBy: enabledBy || 'admin',
      enabledAt: now,
    },
  });
});
