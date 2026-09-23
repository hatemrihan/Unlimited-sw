/**
 * @jest-environment node
 *
 * End-to-end tests for the global free-shipping override.
 *
 * Covers:
 *   1. isFreeShippingActive() — active, expired, not-set, self-healing
 *   2. computeOrderPricing() — zeroes shipping+COD when override is active
 *   3. computeOrderPricing() — normal shipping when override is off/expired
 *   4. Interaction with promo waiveShipping — no conflict
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import Product from '@/product/model';
import Promo from '../models/promo';
import FreeShippingOverride from '../models/freeShippingOverride';
import { computeOrderPricing } from '../services/orderPricingService';
import { isFreeShippingActive, getFreeShippingStatus, isProductShippingWaived } from '../lib/freeShippingCheck';
import { apiCache } from '../lib/cache';

jest.setTimeout(120_000);

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'freeshiptest' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Product.deleteMany({});
  await Promo.deleteMany({});
  await FreeShippingOverride.deleteMany({});
  // Clear the cache between tests so each test starts fresh
  apiCache.delete('free-shipping:status');
  apiCache.delete('free-shipping:full-status');
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function seedProduct(overrides: any = {}) {
  return Product.create({
    name: 'Test Bar',
    description: 'test',
    price: 500,
    mainImage: 'https://example.com/a.jpg',
    stock: 10,
    variants: [],
    ...overrides,
  });
}

function orderPayload(products: any[], extra: any = {}) {
  return {
    customer: { name: 'A', email: 'a@b.com', phone: '1', address: 'x', governorate: 'Cairo' },
    paymentMethod: 'cashOnDelivery',
    products,
    ...extra,
  };
}

async function setOverride(enabled: boolean, expiresAt: Date) {
  await FreeShippingOverride.updateOne(
    { key: 'global' },
    { $set: { enabled, expiresAt, enabledBy: 'test', enabledAt: new Date(), applyToAll: true, productIds: [] } },
    { upsert: true }
  );
  apiCache.delete('free-shipping:status');
  apiCache.delete('free-shipping:full-status');
}

async function setProductOverride(enabled: boolean, expiresAt: Date, productIds: string[]) {
  await FreeShippingOverride.updateOne(
    { key: 'global' },
    { $set: { enabled, expiresAt, enabledBy: 'test', enabledAt: new Date(), applyToAll: false, productIds } },
    { upsert: true }
  );
  apiCache.delete('free-shipping:status');
  apiCache.delete('free-shipping:full-status');
}

// ── isFreeShippingActive() ─────────────────────────────────────────────────

describe('isFreeShippingActive()', () => {
  it('returns false when no override document exists', async () => {
    expect(await isFreeShippingActive()).toBe(false);
  });

  it('returns true when override is enabled and not expired', async () => {
    await setOverride(true, new Date(Date.now() + 3600_000)); // +1h
    expect(await isFreeShippingActive()).toBe(true);
  });

  it('returns false when override is disabled', async () => {
    await setOverride(false, new Date(Date.now() + 3600_000));
    expect(await isFreeShippingActive()).toBe(false);
  });

  it('returns false and self-heals when override has expired', async () => {
    await setOverride(true, new Date(Date.now() - 1000)); // Already expired
    expect(await isFreeShippingActive()).toBe(false);

    // Verify the DB was updated (self-healing)
    const doc = await FreeShippingOverride.findOne({ key: 'global' }).lean() as any;
    expect(doc.enabled).toBe(false);
  });

  it('caches the result and avoids repeated DB reads', async () => {
    await setOverride(true, new Date(Date.now() + 3600_000));

    // First call populates cache
    expect(await isFreeShippingActive()).toBe(true);

    // Secretly change DB — the cached value should still be true
    await FreeShippingOverride.updateOne({ key: 'global' }, { $set: { enabled: false } });
    // Don't clear cache! Should still return true from cache.
    expect(await isFreeShippingActive()).toBe(true);

    // Clear cache — now should see the DB change
    apiCache.delete('free-shipping:status');
    expect(await isFreeShippingActive()).toBe(false);
  });
});

describe('getFreeShippingStatus()', () => {
  it('returns active: false when not enabled or no doc', async () => {
    const status = await getFreeShippingStatus();
    expect(status.active).toBe(false);
    expect(status.expiresAt).toBeNull();
  });

  it('returns active: true with ISO string expiry when active', async () => {
    const future = new Date(Date.now() + 3600_000);
    await setOverride(true, future);

    const status = await getFreeShippingStatus();
    expect(status.active).toBe(true);
    expect(status.expiresAt).toBe(future.toISOString());
  });

  it('returns active: false and self-heals when expired', async () => {
    const past = new Date(Date.now() - 60_000);
    await setOverride(true, past);

    const status = await getFreeShippingStatus();
    expect(status.active).toBe(false);
    expect(status.expiresAt).toBeNull();

    const doc = await FreeShippingOverride.findOne({ key: 'global' });
    expect(doc?.enabled).toBe(false);
  });
});

// ── computeOrderPricing() with free-shipping override ──────────────────────

describe('free-shipping override in order pricing', () => {
  it('zeroes shipping and keeps COD fee when the global override is active', async () => {
    const product = await seedProduct({
      price: 1000,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 80, codFee: 30, isActive: true }],
    });

    // Without override — should charge shipping + COD
    const normal = await computeOrderPricing(
      orderPayload([{ productId: String(product._id), name: 'X', price: 1000, quantity: 2 }])
    );
    expect(normal.pricing!.shippingCost).toBe(160); // 80 * 2
    expect(normal.pricing!.codFee).toBe(60);         // 30 * 2
    expect(normal.pricing!.totalAmount).toBe(2000 + 160 + 60); // 2220

    // Activate override
    await setOverride(true, new Date(Date.now() + 3600_000));

    const free = await computeOrderPricing(
      orderPayload([{ productId: String(product._id), name: 'X', price: 1000, quantity: 2 }])
    );
    expect(free.pricing!.shippingCost).toBe(0);
    expect(free.pricing!.codFee).toBe(60); // COD fee kept
    expect(free.pricing!.totalAmount).toBe(2060); // Product price + COD fee
  });

  it('returns normal shipping when override is expired', async () => {
    const product = await seedProduct({
      price: 500,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 50, codFee: 20, isActive: true }],
    });

    // Set an already-expired override
    await setOverride(true, new Date(Date.now() - 1000));

    const result = await computeOrderPricing(
      orderPayload([{ productId: String(product._id), name: 'X', price: 500, quantity: 1 }])
    );

    // Should NOT be free — override is expired
    expect(result.pricing!.shippingCost).toBe(50);
    expect(result.pricing!.codFee).toBe(20);
    expect(result.pricing!.totalAmount).toBe(500 + 50 + 20);
  });

  it('returns normal shipping when override is disabled', async () => {
    const product = await seedProduct({
      price: 500,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 50, codFee: 20, isActive: true }],
    });

    await setOverride(false, new Date(Date.now() + 3600_000));

    const result = await computeOrderPricing(
      orderPayload([{ productId: String(product._id), name: 'X', price: 500, quantity: 1 }])
    );

    expect(result.pricing!.shippingCost).toBe(50);
    expect(result.pricing!.codFee).toBe(20);
  });

  it('does not conflict with promo waiveShipping', async () => {
    const product = await seedProduct({
      price: 1000,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 60, codFee: 25, isActive: true }],
    });
    await Promo.create({
      code: 'SHIP50',
      discountType: 'fixed',
      discountValue: 50,
      isActive: true,
      waiveShipping: true,
    });

    // Activate the global override
    await setOverride(true, new Date(Date.now() + 3600_000));

    const result = await computeOrderPricing(
      orderPayload(
        [{ productId: String(product._id), name: 'X', price: 1000, quantity: 1 }],
        { promoCode: 'SHIP50' }
      )
    );

    // Both mechanisms: global override zeroes shipping first, promo discount applies to subtotal, COD kept
    expect(result.pricing!.shippingCost).toBe(0);
    expect(result.pricing!.codFee).toBe(25);
    expect(result.pricing!.discountAmount).toBe(50);
    expect(result.pricing!.totalAmount).toBe(975); // 1000 - 50 discount + 25 COD
  });

  it('handles multiple products with different governorate pricing', async () => {
    const p1 = await seedProduct({
      name: 'Pull-up Bar',
      price: 3000,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 100, codFee: 40, isActive: true }],
    });
    const p2 = await seedProduct({
      name: 'Parallel Bar',
      price: 1500,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 70, codFee: 25, isActive: true }],
    });

    // Activate override
    await setOverride(true, new Date(Date.now() + 3600_000));

    const result = await computeOrderPricing(
      orderPayload([
        { productId: String(p1._id), name: 'Pull-up Bar', price: 3000, quantity: 1 },
        { productId: String(p2._id), name: 'Parallel Bar', price: 1500, quantity: 2 },
      ])
    );

    // Shipping is zero, but COD is kept: 40 + (25*2) = 90
    expect(result.pricing!.shippingCost).toBe(0);
    expect(result.pricing!.codFee).toBe(90);
    // Total = 3000 + (1500*2) + 90 = 6090
    expect(result.pricing!.totalAmount).toBe(6090);
  });

  it('instaPay still has zero COD even without the override', async () => {
    const product = await seedProduct({
      price: 500,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 50, codFee: 20, isActive: true }],
    });

    // Override active + instaPay
    await setOverride(true, new Date(Date.now() + 3600_000));

    const result = await computeOrderPricing(
      orderPayload(
        [{ productId: String(product._id), name: 'X', price: 500, quantity: 1 }],
        { paymentMethod: 'instaPay' }
      )
    );

    expect(result.pricing!.shippingCost).toBe(0);
    expect(result.pricing!.codFee).toBe(0);
    expect(result.pricing!.totalAmount).toBe(500);
  });

  // ── Finding #1 Regression Test: Legacy Document Compatibility ────────────
  it('CRITICAL: handles legacy pre-existing document missing applyToAll and productIds without throwing', async () => {
    const product = await seedProduct({
      price: 1000,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 80, codFee: 30, isActive: true }],
    });

    // Directly insert raw document into MongoDB with NO applyToAll and NO productIds
    // exactly matching what exists in production before migration
    await mongoose.connection.collection('freeshippingoverrides').insertOne({
      key: 'global',
      enabled: true,
      expiresAt: new Date(Date.now() + 3600_000),
      enabledBy: 'admin',
      enabledAt: new Date(),
    });
    apiCache.delete('free-shipping:status');
    apiCache.delete('free-shipping:full-status');

    // Must NOT throw TypeError: Cannot read properties of undefined (reading 'includes')
    const result = await computeOrderPricing(
      orderPayload([{ productId: String(product._id), name: 'Bar', price: 1000, quantity: 1 }])
    );

    expect(result.success).toBe(true);
    // Defaults safely to apply-to-all: zero shipping and kept COD (30)
    expect(result.pricing!.shippingCost).toBe(0);
    expect(result.pricing!.codFee).toBe(30);
    expect(result.pricing!.totalAmount).toBe(1030);
  });

  // ── Product-Specific Free Shipping ───────────────────────────────────────
  it('only waives shipping and keeps COD for eligible products when applyToAll is false', async () => {
    const p1 = await seedProduct({
      name: 'Eligible Bar',
      price: 1000,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 50, codFee: 20, isActive: true }],
    });
    const p2 = await seedProduct({
      name: 'Non-Eligible Ring',
      price: 500,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 30, codFee: 15, isActive: true }],
    });

    // Only p1 is in productIds
    await setProductOverride(true, new Date(Date.now() + 3600_000), [String(p1._id)]);

    const result = await computeOrderPricing(
      orderPayload([
        { productId: String(p1._id), name: 'Eligible Bar', price: 1000, quantity: 1 },
        { productId: String(p2._id), name: 'Non-Eligible Ring', price: 500, quantity: 1 },
      ])
    );

    expect(result.success).toBe(true);
    // p1 has 0 shipping + 20 COD; p2 charges 30 shipping + 15 COD
    expect(result.pricing!.shippingCost).toBe(30);
    expect(result.pricing!.codFee).toBe(35); // 20 + 15 = 35
    // Total = 1000 + 500 + 30 + 35 = 1565
    expect(result.pricing!.totalAmount).toBe(1565);
  });
});

describe('isProductShippingWaived() helper', () => {
  it('returns false when override is null or undefined', () => {
    expect(isProductShippingWaived(null, '123')).toBe(false);
    expect(isProductShippingWaived(undefined, '123')).toBe(false);
  });

  it('returns true when applyToAll is true', () => {
    expect(isProductShippingWaived({ applyToAll: true, productIds: [] }, '123')).toBe(true);
  });

  it('returns true when applyToAll is undefined (legacy fallback)', () => {
    expect(isProductShippingWaived({}, '123')).toBe(true);
  });

  it('matches productIds when applyToAll is false', () => {
    const override = { applyToAll: false, productIds: ['prod-1', 'prod-2'] };
    expect(isProductShippingWaived(override, 'prod-1')).toBe(true);
    expect(isProductShippingWaived(override, 'prod-2')).toBe(true);
    expect(isProductShippingWaived(override, 'prod-3')).toBe(false);
  });

  it('safely handles non-array productIds when applyToAll is false', () => {
    const override = { applyToAll: false, productIds: undefined as any };
    expect(isProductShippingWaived(override, 'prod-1')).toBe(false);
  });
});

