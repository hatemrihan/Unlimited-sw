/**
 * @jest-environment node
 *
 * Recording revenue.
 *
 * Purchase is the only event in the funnel that cannot be resampled. A lost
 * page view is one observation among thousands; a lost or duplicated purchase
 * changes the number the business makes decisions on, and it is the denominator
 * of every rate in the report.
 *
 * So it gets two properties the browser could never give it:
 *
 *  - It is written from the SERVER, once the order transaction has committed,
 *    so ad-blockers, closed tabs and slow connections cannot lose it. Those
 *    losses would fall hardest on exactly the mobile traffic this shop runs on,
 *    quietly understating conversion.
 *  - Its `eventId` is DERIVED from the order id, so writing it twice is
 *    impossible rather than merely unlikely.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import AnalyticsEvent from '../analytics/model';
import { recordPurchase } from '../analytics/purchase';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'purchaseevents' });
  await AnalyticsEvent.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await AnalyticsEvent.deleteMany({});
});

const SESSION = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

const order = {
  orderId: 'ALK123456ABCDEF',
  totalAmount: 1450,
  products: [{ quantity: 2 }, { quantity: 1 }],
};

describe('recording a purchase', () => {
  it('writes one event carrying the order total', async () => {
    await recordPurchase(order, SESSION);

    const events = await AnalyticsEvent.find({ name: 'Purchase' });
    expect(events).toHaveLength(1);
    expect(events[0].payload.value).toBe(1450);
    expect(events[0].payload.orderId).toBe(order.orderId);
    expect(events[0].payload.currency).toBe('EGP');
  });

  it('counts the units bought, not the lines', async () => {
    // Two of one thing and one of another is three items, not two orders.
    await recordPurchase(order, SESSION);

    const event = await AnalyticsEvent.findOne({ name: 'Purchase' });
    expect(event!.payload.itemCount).toBe(3);
  });

  it('marks itself as server-written, so the two sources stay distinguishable', async () => {
    await recordPurchase(order, SESSION);

    const event = await AnalyticsEvent.findOne({ name: 'Purchase' });
    expect(event!.payload.source).toBe('server');
  });

  it('joins to the session that did the browsing', async () => {
    await recordPurchase(order, SESSION);

    const event = await AnalyticsEvent.findOne({ name: 'Purchase' });
    expect(event!.sessionId).toBe(SESSION);
  });
});

describe('exactly once', () => {
  it('records nothing extra when the same order is recorded twice', async () => {
    // The order route can reach this more than once: a retried request, or a
    // duplicate checkout answered from the idempotency guard.
    await recordPurchase(order, SESSION);
    await recordPurchase(order, SESSION);

    expect(await AnalyticsEvent.countDocuments({ name: 'Purchase' })).toBe(1);
  });

  it('does not throw on the second attempt', async () => {
    // A throw here would be caught by the route and logged as a failure,
    // sending someone to investigate a duplicate that the design intends.
    await recordPurchase(order, SESSION);

    await expect(recordPurchase(order, SESSION)).resolves.toBeUndefined();
  });

  it('keeps the first session when a retry arrives without one', async () => {
    // The first write is the truth. A later attempt must not overwrite a real
    // session id with the synthetic fallback.
    await recordPurchase(order, SESSION);
    await recordPurchase(order, undefined);

    const events = await AnalyticsEvent.find({ name: 'Purchase' });
    expect(events).toHaveLength(1);
    expect(events[0].sessionId).toBe(SESSION);
  });

  it('derives its id from the order, so dedup does not depend on timing', async () => {
    await recordPurchase(order, SESSION);

    const event = await AnalyticsEvent.findOne({ name: 'Purchase' });
    expect(event!.eventId).toBe(`purchase:${order.orderId}`);
  });

  it('counts two genuinely different orders separately', async () => {
    await recordPurchase(order, SESSION);
    await recordPurchase({ ...order, orderId: 'ALK999999ZZZZZZ', totalAmount: 200 }, SESSION);

    const events = await AnalyticsEvent.find({ name: 'Purchase' }).sort({ eventId: 1 });
    expect(events).toHaveLength(2);
    expect(events.reduce((sum, e) => sum + (e.payload.value as number), 0)).toBe(1650);
  });
});

describe('a customer with tracking blocked', () => {
  it('still has their revenue recorded', async () => {
    // Private mode, storage disabled, or an extension. They are a customer,
    // not a problem, and dropping their order would understate revenue.
    await recordPurchase(order, undefined);

    const event = await AnalyticsEvent.findOne({ name: 'Purchase' });
    expect(event!.payload.value).toBe(1450);
  });

  it('is filed against the order itself, so nothing collides', async () => {
    await recordPurchase(order, undefined);
    await recordPurchase({ ...order, orderId: 'ALK999999ZZZZZZ' }, undefined);

    const sessions = (await AnalyticsEvent.find({ name: 'Purchase' })).map(e => e.sessionId);
    expect(new Set(sessions).size).toBe(2);
    expect(sessions).toContain(`server:${order.orderId}`);
  });
});

describe('where the route calls it', () => {
  // Source-level, deliberately. The properties below are about POSITION in the
  // handler, and position is invisible to a unit test — but moving this call a
  // few lines up would start recording revenue for orders that never committed,
  // and nothing else would notice.
  const source = readFileSync(join(process.cwd(), 'app', 'api', 'orders', 'route.ts'), 'utf8');

  it('records only after the transaction has succeeded', () => {
    const afterCommit = source.indexOf('savedOrder = txResult.savedOrder');
    const recordsPurchase = source.indexOf('recordPurchase(');

    expect(afterCommit).toBeGreaterThan(-1);
    expect(recordsPurchase).toBeGreaterThan(afterCommit);
  });

  it('cannot fail the order it is measuring', () => {
    // The customer has paid and the stock is reserved. An analytics failure
    // here must be a line in a log, never a 500 handed to someone who has
    // already bought something.
    const at = source.indexOf('await recordPurchase(');
    const before = source.slice(Math.max(0, at - 200), at);
    const after = source.slice(at, at + 300);

    expect(before).toContain('try {');
    expect(after).toContain('catch');
  });

  it('is awaited, because a detached promise dies with the function', () => {
    // Netlify kills the function the moment it responds. Fire-and-forget here
    // would lose revenue events under exactly the load that makes them matter.
    expect(source).toMatch(/await\s+recordPurchase\(/);
  });
});

describe('an order with no lines', () => {
  it('records zero items rather than failing', async () => {
    // Defensive: a malformed order must not take the analytics write down with
    // it, because that write is inside the request that answers the customer.
    await recordPurchase({ orderId: 'ALK000', totalAmount: 0, products: undefined }, SESSION);

    const event = await AnalyticsEvent.findOne({ name: 'Purchase' });
    expect(event!.payload.itemCount).toBe(0);
  });
});
