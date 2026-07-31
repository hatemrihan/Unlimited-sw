/**
 * @jest-environment node
 *
 * Stage 5 regression suite for the inventory module: the admin adjustment path
 * and the canonical availability read.
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import Product from '../models/product';
import { adjustStock, getAvailability, StockConflictError } from '../services/inventory.service';
import { updateProduct } from '../services/product.service';

jest.setTimeout(120_000);

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'inventorytest' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Product.deleteMany({});
});

async function seedProduct(overrides: any = {}) {
  return Product.create({
    name: 'Test Hoodie',
    description: 'test',
    price: 100,
    mainImage: 'https://example.com/a.jpg',
    stock: 10,
    variants: [{ name: 'Red', stock: 6 }, { name: 'Blue', stock: 4 }],
    ...overrides,
  });
}

describe('adjustStock — optimistic lock', () => {
  it('applies the change when the expected value still matches', async () => {
    const product = await seedProduct();

    const result = await adjustStock(String(product._id), 'Red', { expected: 6, next: 9 });

    expect(result.variants.find(v => v.name === 'Red')!.stock).toBe(9);
    // The mirror moves by the same delta, so a concurrent change to Blue survives.
    expect(result.stock).toBe(13);
  });

  it('rejects the write when stock moved since the page loaded', async () => {
    const product = await seedProduct();

    // An order lands between page load and save.
    await adjustStock(String(product._id), 'Red', { delta: -1 });

    await expect(
      adjustStock(String(product._id), 'Red', { expected: 6, next: 9 })
    ).rejects.toBeInstanceOf(StockConflictError);

    const after = await Product.findById(product._id);
    expect(after.variants.find((v: any) => v.name === 'Red').stock).toBe(5);
  });

  it('never drives stock below zero with a delta', async () => {
    const product = await seedProduct();

    await expect(
      adjustStock(String(product._id), 'Red', { delta: -99 })
    ).rejects.toBeInstanceOf(StockConflictError);

    const after = await Product.findById(product._id);
    expect(after.variants.find((v: any) => v.name === 'Red').stock).toBe(6);
    expect(after.stock).toBe(10);
  });

  it('adjusts a variant-less product', async () => {
    const product = await seedProduct({ variants: [], stock: 5 });

    const result = await adjustStock(String(product._id), undefined, { delta: 3 });
    expect(result.stock).toBe(8);

    await expect(
      adjustStock(String(product._id), undefined, { expected: 5, next: 1 })
    ).rejects.toBeInstanceOf(StockConflictError);
  });

  it('rejects an unknown variant', async () => {
    const product = await seedProduct();
    await expect(
      adjustStock(String(product._id), 'Chartreuse', { delta: 1 })
    ).rejects.toBeInstanceOf(StockConflictError);
  });
});

describe('getAvailability', () => {
  it('returns per-variant and total stock, ignoring invalid ids', async () => {
    const product = await seedProduct();

    const result = await getAvailability([String(product._id), 'static-product-1']);

    expect(Object.keys(result)).toEqual([String(product._id)]);
    expect(result[String(product._id)]).toMatchObject({ stock: 10, isActive: true });
    expect(result[String(product._id)].variants).toEqual([
      { name: 'Red', stock: 6 },
      { name: 'Blue', stock: 4 },
    ]);
  });

  it('returns an empty map for no ids', async () => {
    expect(await getAvailability([])).toEqual({});
  });
});

describe('product update no longer clobbers stock', () => {
  it('keeps database stock when the edit form posts a stale variants array', async () => {
    const product = await seedProduct();

    // An order decrements Red after the admin's browser loaded the page.
    await adjustStock(String(product._id), 'Red', { delta: -2 });

    // The admin saves the form they loaded before that order, still showing 6.
    await updateProduct(String(product._id), {
      name: 'Renamed Hoodie',
      variants: [{ name: 'Red', stock: 6 }, { name: 'Blue', stock: 4 }],
      stock: 10,
    } as any);

    const after = await Product.findById(product._id);
    expect(after.name).toBe('Renamed Hoodie');
    expect(after.variants.find((v: any) => v.name === 'Red').stock).toBe(4);
    expect(after.variants.find((v: any) => v.name === 'Blue').stock).toBe(4);
    expect(after.stock).toBe(8);
  });

  it('creates a newly added variant at zero rather than at the typed value', async () => {
    const product = await seedProduct();

    await updateProduct(String(product._id), {
      variants: [{ name: 'Red', stock: 6 }, { name: 'Blue', stock: 4 }, { name: 'Green', stock: 50 }],
    } as any);

    const after = await Product.findById(product._id);
    expect(after.variants.find((v: any) => v.name === 'Green').stock).toBe(0);
    expect(after.stock).toBe(10);
  });

  it('drops the stock of a removed variant from the mirror', async () => {
    const product = await seedProduct();

    await updateProduct(String(product._id), {
      variants: [{ name: 'Red', stock: 6 }],
    } as any);

    const after = await Product.findById(product._id);
    expect(after.variants).toHaveLength(1);
    expect(after.stock).toBe(6);
  });
});
