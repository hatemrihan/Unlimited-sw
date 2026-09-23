import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { withDb } from '../../../../lib/withDb';
import { requireAdmin } from '../../../../lib/requireAdmin';
import { invalidateFreeShippingCache } from '../../../../lib/cache';
import FreeShippingOverride, { type IFreeShippingOverride } from '../../../../models/freeShippingOverride';

/**
 * Admin API for the global free-shipping override.
 *
 * GET  → current state
 * PUT  → toggle on/off with expiry and scope (applyToAll vs specific productIds)
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
        applyToAll: true,
        productIds: [],
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
      applyToAll: doc.applyToAll ?? true,
      productIds: Array.isArray(doc.productIds) ? doc.productIds : [],
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
      {
        $set: {
          enabled: false,
          applyToAll: body.applyToAll ?? true,
          productIds: Array.isArray(body.productIds) ? body.productIds : [],
        },
      },
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

  const applyToAll = body.applyToAll !== false;
  let productIds: string[] = [];

  if (!applyToAll) {
    if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one product must be selected when applyToAll is false.' },
        { status: 400 }
      );
    }
    const invalidIds = body.productIds.filter((id: any) => typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { success: false, error: 'One or more selected product IDs are invalid.' },
        { status: 400 }
      );
    }
    productIds = body.productIds.map(String);
  }

  await FreeShippingOverride.updateOne(
    { key: 'global' },
    {
      $set: {
        enabled: true,
        expiresAt: expiry,
        enabledBy: enabledBy || 'admin',
        enabledAt: now,
        applyToAll,
        productIds,
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
      applyToAll,
      productIds,
    },
  });
});

