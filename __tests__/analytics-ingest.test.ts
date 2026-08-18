/**
 * @jest-environment node
 *
 * The public ingest endpoint.
 *
 * It has to be open — the visitors it counts have no account and never will.
 * So every protection it has must work without knowing who is calling, and
 * these tests hold the three that do: the schema refuses anything it does not
 * recognise, the rate limit refuses a script, and the endpoint answers a
 * failure of its own without ever looking like the site is broken.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import AnalyticsEvent from '../analytics/model';
import RequestCounter from '../models/requestCounter';
import { POST } from '../app/api/analytics/events/route';
import { MAX_EVENTS_PER_REQUEST } from '../analytics/events';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'analyticsingest' });
  await AnalyticsEvent.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await AnalyticsEvent.deleteMany({});
  await RequestCounter.deleteMany({});
  jest.restoreAllMocks();
});

const SESSION = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

/** A UUID per index, so a test can send a batch of genuinely distinct events. */
function uuid(n: number) {
  return `5c9d1e70-4f89-11d3-9a0c-${String(n).padStart(12, '0')}`;
}

function event(n: number, overrides: Record<string, unknown> = {}) {
  return { name: 'PageView', sessionId: SESSION, eventId: uuid(n), payload: { path: '/shop' }, ...overrides };
}

/** One request, from `ip` so the throttle can tell callers apart. */
function post(body: unknown, ip = '41.44.1.2') {
  return POST(
    new Request('http://localhost/api/analytics/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }) as never
  );
}

describe('accepting events', () => {
  it('answers 202 and says what it stored', async () => {
    const response = await post({ events: [event(1), event(2)] });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, accepted: 2, duplicates: 0 });
    expect(await AnalyticsEvent.countDocuments({})).toBe(2);
  });

  it('reports a replayed batch as duplicates rather than storing it twice', async () => {
    // sendBeacon can fire twice on tab close, and a flaky connection retries.
    await post({ events: [event(1)] });

    const response = await post({ events: [event(1), event(2)] });

    await expect(response.json()).resolves.toEqual({ success: true, accepted: 1, duplicates: 1 });
    expect(await AnalyticsEvent.countDocuments({})).toBe(2);
  });

  it('never caches', async () => {
    const response = await post({ events: [event(1)] });

    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});

describe('refusing bad input', () => {
  it('refuses a body that is not JSON', async () => {
    const response = await post('not json at all');

    expect(response.status).toBe(400);
    expect(await AnalyticsEvent.countDocuments({})).toBe(0);
  });

  it('refuses an unknown event name', async () => {
    const response = await post({ events: [event(1, { name: 'Checkout' })] });

    expect(response.status).toBe(400);
    expect(await AnalyticsEvent.countDocuments({})).toBe(0);
  });

  it('refuses more events than the cap allows', async () => {
    const tooMany = Array.from({ length: MAX_EVENTS_PER_REQUEST + 1 }, (_, i) => event(i));

    expect((await post({ events: tooMany })).status).toBe(400);
  });

  it('stores nothing personal even when asked to', async () => {
    // The schema strips it; this proves the route does not route around the
    // schema on its way to the database.
    await post({
      events: [event(1, { payload: { path: '/checkout', email: 'a@b.com', phone: '+201234567890' } })],
    });

    const stored = await AnalyticsEvent.findOne({ eventId: uuid(1) });
    expect(stored!.payload).toEqual({ path: '/checkout' });
  });

  it('says little about why it refused', async () => {
    // A detailed validation report is a map of the schema for whoever is
    // probing it, and the caller is a script that cannot act on the detail.
    const response = await post({ events: [event(1, { eventId: 'nope' })] });

    await expect(response.json()).resolves.toEqual({ success: false, error: 'Invalid events' });
  });
});

describe('the rate limit', () => {
  it('lets a normal session through', async () => {
    // A real visitor flushes once or twice per session.
    for (let i = 0; i < 5; i++) {
      expect((await post({ events: [event(i)] })).status).toBe(202);
    }
  });

  it('refuses the request after the limit, with a retry hint', async () => {
    for (let i = 0; i < 60; i++) await post({ events: [event(i)] });

    const refused = await post({ events: [event(999)] });

    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('counts each address separately, so one script cannot silence a whole carrier', async () => {
    // Egyptian mobile networks put very many real customers behind one address;
    // the limiter must at least not conflate unrelated ones.
    for (let i = 0; i < 61; i++) await post({ events: [event(i)] }, '41.44.1.2');

    const other = await post({ events: [event(500)] }, '41.44.9.9');

    expect(other.status).toBe(202);
  });
});

describe('when the database is unavailable', () => {
  it('answers 503 rather than pretending it stored the events', async () => {
    jest.spyOn(AnalyticsEvent, 'insertMany').mockRejectedValue(new Error('mongo down'));

    const response = await post({ events: [event(1)] });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Could not record events',
    });
  });
});
