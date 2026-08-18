/**
 * @jest-environment node
 *
 * The funnel report.
 *
 * Seeded with three sessions whose stories are known, so every number below can
 * be checked by hand rather than trusted:
 *
 *   session A — viewed, added to cart, checked out, BOUGHT
 *   session B — viewed, added to cart, and left
 *   session C — landed on the site and went no further
 *
 * That gives 3 visitors, 2 product views, 2 baskets, 1 checkout, 1 purchase —
 * a 50% cart abandonment rate and a 33.3% conversion rate. If any of those move
 * without someone intending it, a decision is about to be made on a wrong
 * number.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import AnalyticsEvent from '../analytics/model';
import { buildFunnelReport } from '../analytics/actions';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'funnel' });
  await AnalyticsEvent.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await AnalyticsEvent.deleteMany({});
});

let sequence = 0;

/** Writes straight to the collection so a test can control `createdAt`. */
async function seed(
  name: string,
  sessionId: string,
  payload: Record<string, unknown> = {},
  createdAt: Date = new Date()
) {
  await AnalyticsEvent.create({
    name,
    sessionId,
    eventId: `seed-${sequence++}`,
    payload,
    createdAt,
  });
}

async function seedThreeSessions() {
  // A — the whole way through.
  await seed('PageView', 'A', { path: '/' });
  await seed('ViewContent', 'A', { productId: 'p1', productName: 'Hoodie' });
  await seed('AddToCart', 'A', { productId: 'p1', productName: 'Hoodie', value: 500 });
  await seed('InitiateCheckout', 'A', { itemCount: 1, value: 500 });
  await seed('Purchase', 'A', { orderId: 'ALK1', value: 550, itemCount: 1 });

  // B — filled a basket and left.
  await seed('PageView', 'B', { path: '/' });
  await seed('ViewContent', 'B', { productId: 'p2', productName: 'Rings' });
  await seed('AddToCart', 'B', { productId: 'p2', productName: 'Rings', value: 800 });

  // C — landed and bounced.
  await seed('PageView', 'C', { path: '/' });
}

describe('the stages', () => {
  it('counts sessions that reached each stage', async () => {
    await seedThreeSessions();

    const report = await buildFunnelReport(30);
    const sessions = Object.fromEntries(report.funnel.map(s => [s.name, s.sessions]));

    expect(sessions).toEqual({
      PageView: 3,
      ViewContent: 2,
      AddToCart: 2,
      InitiateCheckout: 1,
      Purchase: 1,
    });
  });

  it('counts a session once however many times it repeats a stage', async () => {
    // Someone reloading a product page four times considered one product once.
    // Counting events here would make every rate in the report meaningless.
    await seed('PageView', 'A', { path: '/' });
    await seed('PageView', 'A', { path: '/shop' });
    await seed('PageView', 'A', { path: '/shop' });

    const report = await buildFunnelReport(30);

    expect(report.funnel[0].sessions).toBe(1);
    expect(report.totalEvents).toBe(3);
  });

  it('reports every stage even when nothing reached it', async () => {
    // A missing row would silently shorten the chart rather than showing a
    // zero, which is the thing the owner most needs to see.
    await seed('PageView', 'A', { path: '/' });

    const report = await buildFunnelReport(30);

    expect(report.funnel).toHaveLength(5);
    expect(report.funnel[4]).toMatchObject({ name: 'Purchase', sessions: 0 });
  });

  it('shows where people are lost between stages', async () => {
    await seedThreeSessions();

    const report = await buildFunnelReport(30);
    const viewContent = report.funnel.find(s => s.name === 'ViewContent')!;
    const checkout = report.funnel.find(s => s.name === 'InitiateCheckout')!;

    expect(viewContent.dropOff).toBeCloseTo(33.3, 1); // 3 → 2
    expect(checkout.dropOff).toBe(50); // 2 → 1
  });
});

describe('the rates', () => {
  it('computes cart abandonment, checkout abandonment and conversion', async () => {
    await seedThreeSessions();

    const report = await buildFunnelReport(30);

    expect(report.cartAbandonmentRate).toBe(50); // 2 baskets, 1 reached checkout
    expect(report.checkoutAbandonmentRate).toBe(0); // 1 checkout, 1 bought
    expect(report.conversionRate).toBeCloseTo(33.3, 1); // 1 of 3 visitors
  });

  it('reports zero rather than NaN on an empty funnel', async () => {
    // Day one, and every quiet week afterwards. "NaN%" on the dashboard reads
    // as a broken page, not as no data yet.
    const report = await buildFunnelReport(30);

    expect(report.conversionRate).toBe(0);
    expect(report.cartAbandonmentRate).toBe(0);
    expect(report.totalRevenue).toBe(0);
    expect(report.averageOrderValue).toBe(0);
    expect(report.funnel.every(stage => stage.sessions === 0)).toBe(true);
  });
});

describe('revenue', () => {
  it('sums the purchases and averages the order value', async () => {
    await seed('Purchase', 'A', { orderId: 'ALK1', value: 550 });
    await seed('Purchase', 'B', { orderId: 'ALK2', value: 450 });

    const report = await buildFunnelReport(30);

    expect(report.totalRevenue).toBe(1000);
    expect(report.orders).toBe(2);
    expect(report.averageOrderValue).toBe(500);
  });
});

describe('abandoned baskets', () => {
  it('lists what was left behind, and nothing that was bought', async () => {
    await seedThreeSessions();

    const report = await buildFunnelReport(30);

    expect(report.topAbandoned).toHaveLength(1);
    expect(report.topAbandoned[0]).toMatchObject({ productId: 'p2', productName: 'Rings', sessions: 1 });
  });

  it('ranks by how many people abandoned each product', async () => {
    await seed('AddToCart', 'A', { productId: 'p1', productName: 'Hoodie' });
    await seed('AddToCart', 'B', { productId: 'p1', productName: 'Hoodie' });
    await seed('AddToCart', 'C', { productId: 'p2', productName: 'Rings' });

    const report = await buildFunnelReport(30);

    expect(report.topAbandoned.map(p => p.productId)).toEqual(['p1', 'p2']);
    expect(report.topAbandoned[0].sessions).toBe(2);
  });

  it('counts one session once, however many times it re-added the product', async () => {
    await seed('AddToCart', 'A', { productId: 'p1', productName: 'Hoodie' });
    await seed('AddToCart', 'A', { productId: 'p1', productName: 'Hoodie' });

    const report = await buildFunnelReport(30);

    expect(report.topAbandoned[0].sessions).toBe(1);
  });

  it('forgets a basket once that session buys anything', async () => {
    await seed('AddToCart', 'A', { productId: 'p1', productName: 'Hoodie' });
    await seed('Purchase', 'A', { orderId: 'ALK1', value: 500 });

    const report = await buildFunnelReport(30);

    expect(report.topAbandoned).toHaveLength(0);
  });
});

describe('daily buckets', () => {
  it('buckets by Cairo days, not UTC ones', async () => {
    // The bug in the implementation this was ported from, and one this project
    // has already fixed once in the promo dates. In August, Egypt is on summer
    // time — UTC+3 — so 22:30 UTC is already 01:30 the NEXT day in Cairo.
    // Bucketing in UTC puts that sale on yesterday's bar; the owner compares it
    // with what they remember, finds it wrong, and stops trusting the report.
    const afterCairoMidnight = new Date('2026-08-17T22:30:00Z'); // 01:30 on the 18th, Cairo

    await seed('Purchase', 'A', { orderId: 'ALK1', value: 500 }, afterCairoMidnight);

    const report = await buildFunnelReport(3650);

    expect(report.dailyChart).toHaveLength(1);
    expect(report.dailyChart[0].day).toBe('2026-08-18');
    expect(report.timezone).toBe('Africa/Cairo');
  });

  it('keeps an evening event on its own Cairo day', async () => {
    // The other side of the same boundary: 18:00 UTC is 21:00 Cairo, still the
    // 17th. A "fix" that simply added a day would break this one.
    const cairoEvening = new Date('2026-08-17T18:00:00Z');

    await seed('Purchase', 'A', { orderId: 'ALK1', value: 500 }, cairoEvening);

    const report = await buildFunnelReport(3650);

    expect(report.dailyChart[0].day).toBe('2026-08-17');
  });

  it('follows Egypt in and out of summer time', async () => {
    // The reason the pipeline names a TIMEZONE rather than adding a fixed
    // offset. Egypt reintroduced DST in 2023, so the offset is +3 in August and
    // +2 in January — a hardcoded +2 would silently misfile every summer sale
    // placed in the first hour of the day.
    await seed('Purchase', 'A', { value: 100 }, new Date('2026-01-17T22:30:00Z')); // 00:30 Jan 18, +2
    await seed('Purchase', 'B', { value: 100 }, new Date('2026-08-17T22:30:00Z')); // 01:30 Aug 18, +3

    const report = await buildFunnelReport(3650);
    const days = report.dailyChart.map(d => d.day);

    expect(days).toContain('2026-01-18');
    expect(days).toContain('2026-08-18');
  });

  it('gives each day a column per stage, oldest first', async () => {
    const day1 = new Date('2026-08-15T10:00:00Z');
    const day2 = new Date('2026-08-16T10:00:00Z');

    await seed('PageView', 'A', {}, day2);
    await seed('PageView', 'B', {}, day1);
    await seed('Purchase', 'B', { value: 100 }, day1);

    const report = await buildFunnelReport(3650);

    expect(report.dailyChart.map(d => d.day)).toEqual(['2026-08-15', '2026-08-16']);
    expect(report.dailyChart[0]).toMatchObject({ PageView: 1, Purchase: 1 });
  });
});

describe('the period window', () => {
  it('ignores anything older than the window asked for', async () => {
    const longAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    await seed('PageView', 'OLD', { path: '/' }, longAgo);
    await seed('PageView', 'NEW', { path: '/' });

    const report = await buildFunnelReport(30);

    expect(report.funnel[0].sessions).toBe(1);
    expect(report.period).toBe('30d');
  });
});
