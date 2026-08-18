/**
 * @jest-environment node
 *
 * Proves a promo code cannot be redeemed more times than its usage limit,
 * including when several orders race for the last use.
 *
 * The bug this covers: the order transaction incremented `usedCount` with a bare
 * $inc that had NO limit condition. The limit was therefore only checked while
 * the customer was still filling in the form, and any number of orders could
 * commit in between — so a "10 uses" code could be redeemed indefinitely.
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import Promo from '../models/promo';
import { incrementPromoUsage, PromoLimitError, validatePromo } from '../services/promoService';
import { createPromoSchema } from '../lib/schemas/promo.schema';

jest.setTimeout(120_000);

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'promotest' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Promo.deleteMany({});
});

async function seedPromo(overrides: Record<string, unknown> = {}) {
  return Promo.create({
    code: 'SAVE10',
    discountType: 'percentage',
    discountValue: 10,
    usedCount: 0,
    isActive: true,
    ...overrides,
  });
}

describe('incrementPromoUsage', () => {
  it('counts a use', async () => {
    await seedPromo({ usageLimit: 5 });

    await incrementPromoUsage('SAVE10');

    const after = await Promo.findOne({ code: 'SAVE10' }).lean<{ usedCount: number }>();
    expect(after?.usedCount).toBe(1);
  });

  it('accepts the code in any case, with surrounding spaces', async () => {
    await seedPromo({ usageLimit: 5 });

    await incrementPromoUsage('  save10  ');

    const after = await Promo.findOne({ code: 'SAVE10' }).lean<{ usedCount: number }>();
    expect(after?.usedCount).toBe(1);
  });

  it('refuses the use that would exceed the limit', async () => {
    await seedPromo({ usageLimit: 2, usedCount: 2 });

    await expect(incrementPromoUsage('SAVE10')).rejects.toBeInstanceOf(PromoLimitError);

    const after = await Promo.findOne({ code: 'SAVE10' }).lean<{ usedCount: number }>();
    expect(after?.usedCount).toBe(2); // unchanged
  });

  it('allows unlimited uses when no limit is set', async () => {
    await seedPromo({ usedCount: 500 });

    await expect(incrementPromoUsage('SAVE10')).resolves.toBeTruthy();
  });

  it('rejects a code that does not exist', async () => {
    await expect(incrementPromoUsage('NOPE')).rejects.toBeInstanceOf(PromoLimitError);
  });

  /**
   * The heart of it: many claims at once against a limit of 3.
   *
   * If the limit were checked before the write instead of inside it, every one
   * of these would read usedCount = 0 and all would succeed.
   */
  it('never exceeds the limit when 10 orders race for 3 remaining uses', async () => {
    await seedPromo({ usageLimit: 3 });

    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, () => incrementPromoUsage('SAVE10'))
    );

    const granted = attempts.filter(a => a.status === 'fulfilled').length;
    const refused = attempts.filter(a => a.status === 'rejected').length;

    expect(granted).toBe(3);
    expect(refused).toBe(7);

    const after = await Promo.findOne({ code: 'SAVE10' }).lean<{ usedCount: number }>();
    expect(after?.usedCount).toBe(3);
  });
});

describe('validatePromo', () => {
  it('rejects a code that has hit its limit', async () => {
    await seedPromo({ usageLimit: 1, usedCount: 1 });

    const result = await validatePromo('SAVE10', 1000);

    expect(result.success).toBe(false);
  });

  it('rejects an inactive code', async () => {
    await seedPromo({ isActive: false });

    await expect(validatePromo('SAVE10', 1000)).resolves.toMatchObject({ success: false });
  });

  it('rejects an order below the minimum', async () => {
    await seedPromo({ minimumOrder: 500 });

    await expect(validatePromo('SAVE10', 100)).resolves.toMatchObject({ success: false });
    await expect(validatePromo('SAVE10', 500)).resolves.toMatchObject({ success: true });
  });

  it('caps a percentage discount at maximumDiscount', async () => {
    await seedPromo({ discountType: 'percentage', discountValue: 50, maximumDiscount: 200 });

    const result = await validatePromo('SAVE10', 10_000);

    // 50% of 10,000 is 5,000 — the cap must hold it to 200.
    expect(result.promo?.discount).toBe(200);
  });

  it('applies a fixed discount as-is', async () => {
    await seedPromo({ discountType: 'fixed', discountValue: 150 });

    const result = await validatePromo('SAVE10', 1000);

    expect(result.promo?.discount).toBe(150);
  });

  it('rejects an expired code but accepts one expiring today', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await seedPromo({ code: 'OLD', expiresAt: yesterday });

    const today = new Date();
    await seedPromo({ code: 'TODAY', expiresAt: today });

    await expect(validatePromo('OLD', 1000)).resolves.toMatchObject({ success: false });
    await expect(validatePromo('TODAY', 1000)).resolves.toMatchObject({ success: true });
  });

  it('refuses a campaign that has not started yet', async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    await seedPromo({ code: 'SOON', startsAt: nextWeek });

    await expect(validatePromo('SOON', 1000)).resolves.toMatchObject({ success: false });
  });

  it('accepts a campaign starting today', async () => {
    await seedPromo({ code: 'NOW', startsAt: new Date() });

    await expect(validatePromo('NOW', 1000)).resolves.toMatchObject({ success: true });
  });

  it('treats a code with no start date as live — existing codes keep working', async () => {
    await seedPromo({ code: 'LEGACY' });

    await expect(validatePromo('LEGACY', 1000)).resolves.toMatchObject({ success: true });
  });
});

describe('promo validation rules', () => {
  it('rejects a percentage over 100', () => {
    const result = createPromoSchema.safeParse({
      code: 'TOOMUCH',
      type: 'percentage',
      discount: 500,
    });

    expect(result.success).toBe(false);
  });

  it('allows a fixed discount above 100 — that is just 150 L.E off', () => {
    const result = createPromoSchema.safeParse({ code: 'FLAT150', type: 'fixed', discount: 150 });

    expect(result.success).toBe(true);
  });

  it('rejects a code with neither a discount nor free shipping', () => {
    const result = createPromoSchema.safeParse({ code: 'NOTHING', type: 'fixed', discount: 0 });

    expect(result.success).toBe(false);
  });

  it('accepts a shipping-only code', () => {
    const result = createPromoSchema.safeParse({
      code: 'FREESHIP',
      type: 'fixed',
      discount: 0,
      waiveShipping: true,
    });

    expect(result.success).toBe(true);
  });

  it('rejects an end date before the start date', () => {
    const result = createPromoSchema.safeParse({
      code: 'BACKWARDS',
      type: 'percentage',
      discount: 10,
      validFrom: '2026-09-01',
      validUntil: '2026-08-01',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a code with spaces — nobody can type it at checkout', () => {
    const result = createPromoSchema.safeParse({
      code: 'TWO WORDS',
      type: 'percentage',
      discount: 10,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a usage limit of zero', () => {
    const result = createPromoSchema.safeParse({
      code: 'ZERO',
      type: 'percentage',
      discount: 10,
      maxUses: 0,
    });

    expect(result.success).toBe(false);
  });
});
