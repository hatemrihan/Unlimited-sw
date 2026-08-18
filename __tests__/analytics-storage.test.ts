/**
 * @jest-environment node
 *
 * Storing events, and refusing to store one twice.
 *
 * The tracker sends batches over unreliable mobile connections and flushes on
 * tab close with `sendBeacon`, which can fire twice. Retries are therefore
 * normal, not exceptional — so "the same event arriving again" has to be a
 * non-event rather than a double count. A funnel that inflates on a flaky
 * connection is worse than no funnel, because it looks like it is working.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import AnalyticsEvent from '../analytics/model';
import { insertEvents } from '../analytics/queries';
import { RETENTION_DAYS } from '../analytics/events';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'analytics' });
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

function event(eventId: string, overrides: Record<string, unknown> = {}) {
  return { name: 'PageView' as const, sessionId: SESSION, eventId, payload: { path: '/' }, ...overrides };
}

describe('insertEvents', () => {
  it('stores a batch', async () => {
    const result = await insertEvents([event('e1'), event('e2'), event('e3')]);

    expect(result).toEqual({ accepted: 3, duplicates: 0 });
    expect(await AnalyticsEvent.countDocuments({})).toBe(3);
  });

  it('does nothing, successfully, for an empty batch', async () => {
    expect(await insertEvents([])).toEqual({ accepted: 0, duplicates: 0 });
  });

  it('counts a resent event once', async () => {
    await insertEvents([event('e1')]);

    const result = await insertEvents([event('e1')]);

    expect(result.accepted).toBe(0);
    expect(result.duplicates).toBe(1);
    expect(await AnalyticsEvent.countDocuments({})).toBe(1);
  });

  it('still stores the new events in a partly-resent batch', async () => {
    // This is why the insert is unordered. An ordered one stops at the first
    // duplicate, so a single resent event would silently discard everything
    // behind it in the batch — the failure mode is invisible and permanent.
    await insertEvents([event('e1')]);

    const result = await insertEvents([event('e1'), event('e2'), event('e3')]);

    expect(result.accepted).toBe(2);
    expect(result.duplicates).toBe(1);
    expect(await AnalyticsEvent.countDocuments({})).toBe(3);
  });

  it('does not throw when everything in the batch is a duplicate', async () => {
    // A tracker answered with an error retries, and would retry forever.
    await insertEvents([event('e1'), event('e2')]);

    await expect(insertEvents([event('e1'), event('e2')])).resolves.toEqual({
      accepted: 0,
      duplicates: 2,
    });
  });

  it('stamps the server clock, ignoring anything the browser claims', async () => {
    // A visitor's laptop can be wrong by hours, and one of those would smear
    // across the daily chart for everybody.
    const before = Date.now();
    await insertEvents([event('e1', { createdAt: new Date('2001-01-01') } as any)]);

    const stored = await AnalyticsEvent.findOne({ eventId: 'e1' });
    expect(stored!.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe('the collection', () => {
  it('dedups on eventId with a unique index', async () => {
    const indexes = await AnalyticsEvent.collection.indexes();
    const dedup = indexes.find(index => index.key?.eventId === 1);

    expect(dedup).toBeDefined();
    expect(dedup!.unique).toBe(true);
  });

  it('expires raw events rather than growing forever', async () => {
    // One row per page view. Left alone this outgrows a shared Atlas tier and
    // takes the rest of the site with it.
    const indexes = await AnalyticsEvent.collection.indexes();
    const ttl = indexes.find(index => index.expireAfterSeconds !== undefined);

    expect(ttl).toBeDefined();
    expect(ttl!.expireAfterSeconds).toBe(RETENTION_DAYS * 24 * 60 * 60);
  });

  it('indexes the two fields every funnel query filters on', async () => {
    const indexes = await AnalyticsEvent.collection.indexes();

    expect(indexes.some(i => i.key?.name === 1 && i.key?.createdAt === -1)).toBe(true);
    expect(indexes.some(i => i.key?.sessionId === 1 && i.key?.createdAt === -1)).toBe(true);
  });
});
