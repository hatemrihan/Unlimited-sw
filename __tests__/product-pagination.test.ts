/**
 * @jest-environment node
 *
 * Covers the storefront paging and batch reads that moved out of the API routes
 * into product/actions.ts, and the four bugs fixed on the way:
 *
 *  1. Pagination loaded EVERY product and sliced in JavaScript.
 *  2. `?page=abc` produced slice(NaN, NaN) — an empty shop, no error.
 *  3. The batch endpoint accepted an unlimited number of ids.
 *  4. One malformed id threw a CastError and failed the whole basket.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('next/cache', () => ({
  __esModule: true,
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: jest.fn(),
}));

import Product from '../product/model';
import { invalidateAllCaches } from '../lib/cache';
import {
  getActiveProductsPage,
  getProductsByIds,
  toPositiveInt,
  MAX_PAGE_SIZE,
  MAX_BATCH_IDS,
} from '../product/actions';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;

beforeAll(async () => {
  // No transactions here, so a plain server is enough (and starts faster).
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'pagingtest' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await Product.deleteMany({});
  invalidateAllCaches();
});

async function seedProducts(count: number, active = true) {
  const created = [];
  for (let i = 1; i <= count; i++) {
    created.push(
      await Product.create({
        name: `Product ${String(i).padStart(2, '0')}`,
        description: 'test',
        price: i * 10,
        mainImage: 'https://example.com/a.jpg',
        stock: 0,
        variants: [],
        isActive: active,
      })
    );
  }
  return created;
}

describe('toPositiveInt', () => {
  it('accepts normal numbers', () => {
    expect(toPositiveInt('5', 1)).toBe(5);
    expect(toPositiveInt(7, 1)).toBe(7);
  });

  it('falls back instead of producing NaN — the empty-shop bug', () => {
    expect(toPositiveInt('abc', 1)).toBe(1);
    expect(toPositiveInt('', 1)).toBe(1);
    expect(toPositiveInt(null, 1)).toBe(1);
    expect(toPositiveInt(undefined, 20)).toBe(20);
  });

  it('rejects zero and negatives', () => {
    expect(toPositiveInt('0', 1)).toBe(1);
    expect(toPositiveInt('-5', 1)).toBe(1);
  });

  it('clamps to the maximum', () => {
    expect(toPositiveInt('100000', 20, MAX_PAGE_SIZE)).toBe(MAX_PAGE_SIZE);
  });

  it('floors fractional input', () => {
    expect(toPositiveInt('3.9', 1)).toBe(3);
  });
});

describe('getActiveProductsPage', () => {
  beforeEach(async () => {
    await seedProducts(25);
  });

  it('returns only the requested page, not the whole collection', async () => {
    const page = await getActiveProductsPage(1, 10);

    expect(page.products).toHaveLength(10);
    expect(page.total).toBe(25);
    expect(page.hasMore).toBe(true);
  });

  it('walks pages without repeating or skipping a product', async () => {
    const first = await getActiveProductsPage(1, 10);
    const second = await getActiveProductsPage(2, 10);
    const third = await getActiveProductsPage(3, 10);

    expect(third.products).toHaveLength(5);
    expect(third.hasMore).toBe(false);

    const names = [...first.products, ...second.products, ...third.products].map(p => p.name);
    expect(new Set(names).size).toBe(25);
  });

  it('keeps the price ordering across pages', async () => {
    const first = await getActiveProductsPage(1, 5);

    expect(first.products.map(p => p.price)).toEqual([10, 20, 30, 40, 50]);
  });

  it('excludes inactive products from both the page and the total', async () => {
    await seedProducts(3, false);

    const page = await getActiveProductsPage(1, 100);

    expect(page.total).toBe(25);
    expect(page.products.every(p => p.isActive)).toBe(true);
  });

  it('returns an empty page past the end rather than failing', async () => {
    const page = await getActiveProductsPage(99, 10);

    expect(page.products).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.total).toBe(25);
  });

  it('treats a junk page number as page 1 instead of returning nothing', async () => {
    const page = await getActiveProductsPage('abc' as never, 10);

    expect(page.page).toBe(1);
    expect(page.products).toHaveLength(10);
  });

  it('refuses to serve more than MAX_PAGE_SIZE in one request', async () => {
    const page = await getActiveProductsPage(1, 100_000);

    expect(page.limit).toBe(MAX_PAGE_SIZE);
  });
});

describe('getProductsByIds', () => {
  it('returns the requested products', async () => {
    const [first, second] = await seedProducts(3);

    const found = await getProductsByIds([String(first._id), String(second._id)]);

    expect(found).toHaveLength(2);
  });

  it('ignores malformed ids instead of failing the whole basket', async () => {
    const [first] = await seedProducts(2);

    const found = await getProductsByIds([String(first._id), 'static-product-1', 'not-an-id']);

    expect(found).toHaveLength(1);
    expect(found[0].name).toBe(first.name);
  });

  it('returns an empty list for empty or invalid input', async () => {
    await expect(getProductsByIds([])).resolves.toEqual([]);
    await expect(getProductsByIds(null)).resolves.toEqual([]);
    await expect(getProductsByIds('nope')).resolves.toEqual([]);
    await expect(getProductsByIds(['bad', 'also-bad'])).resolves.toEqual([]);
  });

  it('caps how many ids one call may ask for', async () => {
    const products = await seedProducts(5);
    const realIds = products.map(p => String(p._id));
    const padding = Array.from({ length: MAX_BATCH_IDS + 50 }, () => new mongoose.Types.ObjectId().toString());

    // The real ids sit past the cap, so a capped call must not return them all.
    const found = await getProductsByIds([...padding, ...realIds]);

    expect(found.length).toBeLessThanOrEqual(MAX_BATCH_IDS);
  });
});
