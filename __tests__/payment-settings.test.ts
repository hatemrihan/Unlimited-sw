/**
 * @jest-environment node
 *
 * Covers the payment settings layer and the bugs found in it:
 *
 *  1. "Only one settings document" was never enforced — the schema declared
 *     `index({}, { unique: true })`, which constrains nothing and was never
 *     created. The live collection had only its `_id_` index.
 *  2. Reading created a document as a side effect, so two simultaneous reads on
 *     an empty collection could produce two documents. `findOne({})` would then
 *     return an arbitrary one, and an admin could switch Cash on Delivery off on
 *     a document checkout never reads.
 *  3. A save had to be traceable to a person, and could not be allowed to smuggle
 *     `instaPayEnabled: false` through.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

// The Data Cache needs a Next request scope that does not exist in a test; pass
// the read through so these exercise the real database path.
jest.mock('next/cache', () => ({
  __esModule: true,
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: jest.fn(),
}));

import PaymentSettings, { SETTINGS_KEY } from '../payments/model';
import {
  getPaymentMethods,
  getPaymentMethodsUncached,
  updatePaymentMethods,
  DEFAULT_METHODS,
} from '../payments/settings';
import { updatePaymentMethodsSchema } from '../payments/schema';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'paymentstest' });
  await PaymentSettings.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await PaymentSettings.deleteMany({});
});

describe('the single-document guarantee', () => {
  it('declares a REAL unique index, unlike the empty one it replaces', async () => {
    const indexes = await PaymentSettings.collection.indexes();
    const unique = indexes.filter(index => index.unique && index.name !== '_id_');

    expect(unique).toHaveLength(1);
    expect(JSON.stringify(unique[0].key)).toBe(JSON.stringify({ key: 1 }));
  });

  it('refuses a second document at the database level', async () => {
    await PaymentSettings.create({ key: SETTINGS_KEY, codEnabled: true, instaPayEnabled: true });

    await expect(
      PaymentSettings.create({ key: SETTINGS_KEY, codEnabled: false, instaPayEnabled: true })
    ).rejects.toThrow();

    expect(await PaymentSettings.countDocuments()).toBe(1);
  });

  it('creates exactly one document when several reads race on an empty collection', async () => {
    await Promise.all(Array.from({ length: 8 }, () => getPaymentMethodsUncached()));

    expect(await PaymentSettings.countDocuments()).toBe(1);
  });

  it('adopts a legacy document that predates the key field, rather than adding another', async () => {
    // Insert without `key`, exactly as the old schema did.
    await PaymentSettings.collection.insertOne({
      codEnabled: false,
      instaPayEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const methods = await getPaymentMethodsUncached();

    expect(methods.codEnabled).toBe(false); // the stored value is respected
    expect(await PaymentSettings.countDocuments()).toBe(1);

    const stamped = await PaymentSettings.findOne({}).lean<{ key?: string }>();
    expect(stamped?.key).toBe(SETTINGS_KEY);
  });
});

describe('reading', () => {
  it('defaults to both methods enabled for a brand-new store', async () => {
    await expect(getPaymentMethodsUncached()).resolves.toEqual(DEFAULT_METHODS);
  });

  it('returns what is stored', async () => {
    await PaymentSettings.create({ key: SETTINGS_KEY, codEnabled: false, instaPayEnabled: true });

    await expect(getPaymentMethodsUncached()).resolves.toEqual({
      codEnabled: false,
      instaPayEnabled: true,
    });
  });

  it('never throws — checkout must not be blocked by this read', async () => {
    await expect(getPaymentMethods()).resolves.toEqual(
      expect.objectContaining({ codEnabled: expect.any(Boolean) })
    );
  });
});

describe('writing', () => {
  it('switches Cash on Delivery off and reads back the change', async () => {
    await updatePaymentMethods({ codEnabled: false }, 'hatem@example.com');

    await expect(getPaymentMethodsUncached()).resolves.toEqual({
      codEnabled: false,
      instaPayEnabled: true,
    });
  });

  it('records who made the change', async () => {
    await updatePaymentMethods({ codEnabled: false }, 'hatem@example.com');

    const doc = await PaymentSettings.findOne({}).lean<{ updatedBy?: string }>();
    expect(doc?.updatedBy).toBe('hatem@example.com');
  });

  it('creates the document if a store has never saved settings', async () => {
    expect(await PaymentSettings.countDocuments()).toBe(0);

    await updatePaymentMethods({ codEnabled: false });

    expect(await PaymentSettings.countDocuments()).toBe(1);
  });

  it('keeps InstaPay enabled no matter what', async () => {
    await PaymentSettings.create({ key: SETTINGS_KEY, codEnabled: true, instaPayEnabled: true });

    await updatePaymentMethods({ codEnabled: true });

    const doc = await PaymentSettings.findOne({}).lean<{ instaPayEnabled: boolean }>();
    expect(doc?.instaPayEnabled).toBe(true);
  });

  it('still writes to the one document after repeated saves', async () => {
    await updatePaymentMethods({ codEnabled: false });
    await updatePaymentMethods({ codEnabled: true });
    await updatePaymentMethods({ codEnabled: false });

    expect(await PaymentSettings.countDocuments()).toBe(1);
  });
});

describe('request validation', () => {
  it('accepts a boolean', () => {
    expect(updatePaymentMethodsSchema.safeParse({ codEnabled: false }).success).toBe(true);
  });

  it('rejects a missing or non-boolean value', () => {
    expect(updatePaymentMethodsSchema.safeParse({}).success).toBe(false);
    expect(updatePaymentMethodsSchema.safeParse({ codEnabled: 'no' }).success).toBe(false);
    expect(updatePaymentMethodsSchema.safeParse({ codEnabled: 0 }).success).toBe(false);
  });

  it('rejects an attempt to smuggle InstaPay off', () => {
    const result = updatePaymentMethodsSchema.safeParse({
      codEnabled: true,
      instaPayEnabled: false,
    });

    expect(result.success).toBe(false);
  });
});
