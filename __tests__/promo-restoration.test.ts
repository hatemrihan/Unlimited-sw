/**
 * @jest-environment node
 *
 * Proves a promo use comes back when the order that claimed it is cancelled or
 * deleted, and comes back exactly once.
 *
 * The bug this covers: `incrementPromoUsage` was claimed inside the order
 * transaction, but nothing anywhere decremented it. `usedCount` only ever went
 * up, so a campaign limited to N uses was silently eaten by cancelled orders and
 * shut off early — nothing logged, nothing thrown.
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import Product from '@/product/model';
import Order from '@/order/model';
import Promo from '../models/promo';
import { createOrderTransaction, resolveVariantName } from '../services/orderCreationService';
import { releasePromoUsage } from '../services/promoService';
import {
  restoreStockForOrder,
  reapplyStockForOrder,
  deleteOrderWithStockRestoration,
} from '../services/stockRestorationService';

jest.setTimeout(120_000);

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'promorestoretest' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
  await Promo.deleteMany({});
});

async function seedProduct(stock = 10) {
  return Product.create({
    name: 'Test Hoodie',
    description: 'test',
    price: 100,
    mainImage: 'https://example.com/a.jpg',
    stock,
    variants: [],
  });
}

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

/** Places an order that claims `promoCode`, exactly as the real route does. */
async function placeOrderWithPromo(productId: string, promoCode?: string) {
  const products = [{ productId, name: 'Test Hoodie', price: 100, quantity: 1 }];
  const orderData = {
    products,
    customer: { name: 'A', email: 'a@b.com', phone: '1', address: 'x' },
  };
  const newOrder: any = {
    customer: orderData.customer,
    products: products.map((p: any) => ({
      productId: p.productId,
      name: p.name,
      price: p.price,
      quantity: p.quantity,
      variantName: resolveVariantName(p),
      image: 'https://example.com/a.jpg',
    })),
    paymentMethod: 'cashOnDelivery',
    totalAmount: 90,
    subtotal: 100,
    shippingCost: 0,
    promoCode,
    discountAmount: 10,
    status: 'pending',
    orderDate: new Date(),
  };

  const result = await createOrderTransaction(orderData, newOrder, promoCode);
  expect(result.success).toBe(true);
  return result.savedOrder;
}

async function usedCount(code = 'SAVE10') {
  const promo = await Promo.findOne({ code }).lean<{ usedCount: number }>();
  return promo?.usedCount;
}

describe('cancelling an order returns its promo use', () => {
  it('gives the use back', async () => {
    await seedPromo({ usageLimit: 5 });
    const product = await seedProduct();

    const order = await placeOrderWithPromo(String(product._id), 'SAVE10');
    expect(await usedCount()).toBe(1);

    const result = await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });

    expect(result.success).toBe(true);
    expect(await usedCount()).toBe(0);
  });

  it('gives it back exactly once, however many times cancel is called', async () => {
    await seedPromo({ usageLimit: 5 });
    const product = await seedProduct();

    const order = await placeOrderWithPromo(String(product._id), 'SAVE10');
    expect(await usedCount()).toBe(1);

    await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });
    await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });
    await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });

    // Not -2. The stockRestored flag guards the promo exactly as it guards stock.
    expect(await usedCount()).toBe(0);
  });

  it('frees the last use so the next customer can have it', async () => {
    await seedPromo({ usageLimit: 1 });
    const product = await seedProduct();

    // First customer takes the only use.
    const first = await placeOrderWithPromo(String(product._id), 'SAVE10');
    expect(await usedCount()).toBe(1);

    // Second customer cannot — the campaign is full.
    const blocked = await placeOrderWithPromo(String(product._id), 'SAVE10').catch(() => null);
    expect(blocked).toBeNull();

    // The first order is cancelled, which should release the use...
    await restoreStockForOrder(String(first._id), { newStatus: 'cancelled' });
    expect(await usedCount()).toBe(0);

    // ...and now the next customer can redeem it.
    await placeOrderWithPromo(String(product._id), 'SAVE10');
    expect(await usedCount()).toBe(1);
  });

  it('leaves an order that never used a code alone', async () => {
    await seedPromo({ usageLimit: 5 });
    const product = await seedProduct();

    const order = await placeOrderWithPromo(String(product._id), undefined);
    expect(await usedCount()).toBe(0);

    const result = await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });

    expect(result.success).toBe(true);
    expect(await usedCount()).toBe(0);
  });
});

describe('deleting an order returns its promo use', () => {
  it('gives the use back before the record is destroyed', async () => {
    await seedPromo({ usageLimit: 5 });
    const product = await seedProduct();

    const order = await placeOrderWithPromo(String(product._id), 'SAVE10');
    expect(await usedCount()).toBe(1);

    const result = await deleteOrderWithStockRestoration(String(order._id));

    expect(result.success).toBe(true);
    expect(await usedCount()).toBe(0);
    expect(await Order.findById(order._id)).toBeNull();
  });

  it('does not credit twice when deleting an already-cancelled order', async () => {
    await seedPromo({ usageLimit: 5 });
    const product = await seedProduct();

    const order = await placeOrderWithPromo(String(product._id), 'SAVE10');
    await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });
    expect(await usedCount()).toBe(0);

    await deleteOrderWithStockRestoration(String(order._id));

    // Still 0, never -1.
    expect(await usedCount()).toBe(0);
  });
});

describe('un-cancelling an order re-claims its promo use', () => {
  it('takes the use back', async () => {
    await seedPromo({ usageLimit: 5 });
    const product = await seedProduct();

    const order = await placeOrderWithPromo(String(product._id), 'SAVE10');
    await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });
    expect(await usedCount()).toBe(0);

    const result = await reapplyStockForOrder(String(order._id), 'confirmed');

    expect(result.success).toBe(true);
    expect(await usedCount()).toBe(1);
  });

  it('refuses if the campaign filled up while the order sat cancelled', async () => {
    await seedPromo({ usageLimit: 1 });
    const product = await seedProduct();

    const order = await placeOrderWithPromo(String(product._id), 'SAVE10');
    await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });

    // Somebody else takes the freed use in the meantime.
    await placeOrderWithPromo(String(product._id), 'SAVE10');
    expect(await usedCount()).toBe(1);

    const result = await reapplyStockForOrder(String(order._id), 'confirmed');

    // Refused rather than pushing usedCount past usageLimit, and reported as a
    // 409-class conflict so the admin is told what moved, not that we broke.
    expect(result.success).toBe(false);
    expect(result.insufficient).toBe(true);
    expect(await usedCount()).toBe(1);

    // The refusal is total — the order stays cancelled and its stock stays free.
    const after = await Order.findById(order._id);
    expect(after?.status).toBe('cancelled');
    expect(after?.stockRestored).toBe(true);
  });
});

describe('releasePromoUsage', () => {
  it('never drives the count below zero', async () => {
    await seedPromo({ usedCount: 0, usageLimit: 5 });

    await releasePromoUsage('SAVE10');

    expect(await usedCount()).toBe(0);
  });

  it('accepts the code in any case, with surrounding spaces', async () => {
    await seedPromo({ usedCount: 2, usageLimit: 5 });

    await releasePromoUsage('  save10  ');

    expect(await usedCount()).toBe(1);
  });

  it('does not throw when the code has since been deleted', async () => {
    await expect(releasePromoUsage('GONE')).resolves.toBeNull();
  });

  it('does nothing for an order with no code', async () => {
    await expect(releasePromoUsage(undefined)).resolves.toBeNull();
  });
});
