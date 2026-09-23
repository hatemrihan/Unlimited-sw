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
import { isFreeShippingActive, getFreeShippingStatus } from '../lib/freeShippingCheck';
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
    { $set: { enabled, expiresAt, enabledBy: 'test', enabledAt: new Date() } },
    { upsert: true }
  );
  apiCache.delete('free-shipping:status');
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
  it('zeroes shipping AND COD when the global override is active', async () => {
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
    expect(free.pricing!.codFee).toBe(0);
    expect(free.pricing!.totalAmount).toBe(2000); // Just the product price
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

    // Both mechanisms: global override zeroes shipping first, promo discount applies to subtotal
    expect(result.pricing!.shippingCost).toBe(0);
    expect(result.pricing!.codFee).toBe(0);
    expect(result.pricing!.discountAmount).toBe(50);
    expect(result.pricing!.totalAmount).toBe(950); // 1000 - 50 discount, free ship
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

    // All shipping and COD should be zero
    expect(result.pricing!.shippingCost).toBe(0);
    expect(result.pricing!.codFee).toBe(0);
    // Total = 3000 + (1500*2) = 6000
    expect(result.pricing!.totalAmount).toBe(6000);
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
});
