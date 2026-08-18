/**
 * @jest-environment node
 *
 * Two protections on the public order endpoint.
 *
 * 1. The throttle. `POST /api/orders` had no limit of any kind, and every
 *    attempt opens a transaction, reserves stock and sends mail over SMTP.
 *
 * 2. The orderId collision retry. `orderId` is unique and generated from a
 *    6-digit timestamp slice plus 6 random characters, so a collision is
 *    unlikely but possible — and when it happened the customer was told "please
 *    try again" AFTER their stock had been reserved and rolled back.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import RequestCounter from '../models/requestCounter';
import Order, { generateOrderId } from '@/order/model';
import { consumeRateLimit, clientKey } from '../lib/throttle';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'throttletest' });
  await Order.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await RequestCounter.deleteMany({});
  await Order.deleteMany({});
  jest.restoreAllMocks();
});

const LIMIT = { limit: 3, windowMs: 60_000 };

describe('consumeRateLimit', () => {
  it('allows requests up to the limit', async () => {
    const first = await consumeRateLimit('order:1.1.1.1', LIMIT);
    const second = await consumeRateLimit('order:1.1.1.1', LIMIT);
    const third = await consumeRateLimit('order:1.1.1.1', LIMIT);

    expect([first.allowed, second.allowed, third.allowed]).toEqual([true, true, true]);
    expect(third.remaining).toBe(0);
  });

  it('refuses the one after the limit, with a retry hint', async () => {
    for (let i = 0; i < 3; i++) await consumeRateLimit('order:1.1.1.1', LIMIT);

    const refused = await consumeRateLimit('order:1.1.1.1', LIMIT);

    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('counts each client separately, so one abuser cannot lock out a whole city', async () => {
    for (let i = 0; i < 4; i++) await consumeRateLimit('order:1.1.1.1', LIMIT);

    const other = await consumeRateLimit('order:2.2.2.2', LIMIT);

    expect(other.allowed).toBe(true);
  });

  it('starts a fresh window once the old one has expired', async () => {
    const start = new Date('2026-08-18T10:00:00Z');
    for (let i = 0; i < 4; i++) await consumeRateLimit('order:1.1.1.1', LIMIT, start);

    const later = new Date(start.getTime() + LIMIT.windowMs + 1000);
    const afterWindow = await consumeRateLimit('order:1.1.1.1', LIMIT, later);

    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(LIMIT.limit - 1);
  });

  it('counts concurrent requests exactly once each', async () => {
    // Ten requests fired together against a limit of three: the count must land
    // on ten, not on some smaller number caused by read-then-write races.
    await Promise.all(
      Array.from({ length: 10 }, () => consumeRateLimit('order:9.9.9.9', LIMIT))
    );

    const record = await RequestCounter.findOne({ key: 'order:9.9.9.9' }).lean<{ count: number }>();
    expect(record?.count).toBe(10);
  });

  it('lets the order through if the counter itself fails', async () => {
    // A database hiccup must never stop customers ordering.
    jest.spyOn(RequestCounter, 'findOneAndUpdate').mockImplementation(() => {
      throw new Error('counter unavailable');
    });

    const result = await consumeRateLimit('order:1.1.1.1', LIMIT);

    expect(result.allowed).toBe(true);
  });
});

describe('clientKey', () => {
  it('takes the first entry of x-forwarded-for, which is the real client', () => {
    const headers = new Headers({ 'x-forwarded-for': '41.44.1.2, 10.0.0.1, 10.0.0.2' });
    expect(clientKey(headers)).toBe('41.44.1.2');
  });

  it('falls back to the other proxy headers', () => {
    expect(clientKey(new Headers({ 'x-real-ip': '41.44.1.3' }))).toBe('41.44.1.3');
    expect(clientKey(new Headers())).toBe('unknown');
  });
});

describe('orderId collisions', () => {
  function newOrder(overrides: Record<string, unknown> = {}) {
    return {
      customer: { name: 'A', email: 'a@b.com', phone: '01012345678', address: 'x' },
      products: [{
        productId: '507f1f77bcf86cd799439011',
        name: 'Hoodie',
        price: 100,
        quantity: 1,
        image: 'https://example.com/a.jpg',
      }],
      paymentMethod: 'cashOnDelivery',
      totalAmount: 100,
      subtotal: 100,
      shippingCost: 0,
      ...overrides,
    };
  }

  it('generates a distinctly shaped id', () => {
    // ALK + 6 timestamp digits + 10 hex characters.
    expect(generateOrderId()).toMatch(/^ALK\d{6}[0-9A-F]{10}$/);
  });

  it('always uses its full random half', () => {
    // The old generator sliced Math.random().toString(36), which yields at most
    // six characters and sometimes fewer — silently less entropy than it looks.
    const ids = Array.from({ length: 500 }, () => generateOrderId());

    for (const id of ids) {
      expect(id).toHaveLength(19);
    }
  });

  it('does not repeat itself within the same millisecond', async () => {
    // Every id generated in one tight loop shares a timestamp, so this measures
    // the random half alone.
    const ids = new Set(Array.from({ length: 5000 }, () => generateOrderId()));

    expect(ids.size).toBe(5000);
  });

  it('still enforces uniqueness — two orders never share an id', async () => {
    const a = await Order.create(newOrder());
    const b = await Order.create(newOrder());

    expect(a.orderId).toBeTruthy();
    expect(a.orderId).not.toBe(b.orderId);
  });

  it('refuses a duplicate id outright, so the index remains the backstop', async () => {
    const taken = generateOrderId();
    await Order.create(newOrder({ orderId: taken }));

    await expect(Order.create(newOrder({ orderId: taken }))).rejects.toMatchObject({ code: 11000 });
  });
});
