/**
 * @jest-environment node
 *
 * CHARACTERIZATION tests for the product read/write layer.
 *
 * These do not assert what the code *should* do — they pin down what it *does
 * today*, before product code is consolidated into one folder. If a later move
 * or refactor changes any behaviour below, this suite fails on a developer's
 * machine instead of in a live store with paying customers.
 *
 * Anything here that is genuinely wrong is marked KNOWN BUG, with the current
 * behaviour asserted anyway. Fixing it should mean deliberately editing the
 * assertion, never quietly discovering the change later.
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// The service layer calls dbConnect(); this suite owns the connection instead.
jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

// unstable_cache/revalidateTag need a Next request scope that does not exist in
// a test. Pass the read straight through so we exercise the real database path.
jest.mock('next/cache', () => ({
  __esModule: true,
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: jest.fn(),
}));

import Product from '@/product/model';
import { invalidateAllCaches } from '../lib/cache';
import { NotFoundError } from '../lib/errors';
import {
  getActiveProducts,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
} from '@/product/actions';

jest.setTimeout(120_000);

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  // createProduct opens a transaction, which requires a replica set.
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'producttest' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Product.deleteMany({});
  // The in-process cache would otherwise leak results between tests.
  invalidateAllCaches();
});

function productInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Product',
    description: 'a product',
    price: 100,
    mainImage: 'https://example.com/a.jpg',
    stock: 0,
    variants: [],
    isActive: true,
    ...overrides,
  };
}

async function seed(overrides: Record<string, unknown> = {}) {
  return Product.create(productInput(overrides));
}

describe('getActiveProducts', () => {
  it('returns only active products', async () => {
    await seed({ name: 'Visible', isActive: true });
    await seed({ name: 'Hidden', isActive: false });

    const products = await getActiveProducts();

    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Visible');
  });

  it('sorts by price ascending', async () => {
    await seed({ name: 'Expensive', price: 900 });
    await seed({ name: 'Cheap', price: 100 });
    await seed({ name: 'Mid', price: 500 });

    const names = (await getActiveProducts()).map(p => p.name);

    expect(names).toEqual(['Cheap', 'Mid', 'Expensive']);
  });

  it('returns an empty list rather than throwing when there are no products', async () => {
    await expect(getActiveProducts()).resolves.toEqual([]);
  });
});

describe('getAdminProducts', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 5; i++) {
      await seed({ name: `Product ${i}`, price: i * 100 });
    }
  });

  it('paginates at the database level and reports the totals', async () => {
    const page1 = await getAdminProducts('', 1, 2);

    expect(page1.products).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.pages).toBe(3);
    expect(page1.hasNext).toBe(true);
    expect(page1.hasPrev).toBe(false);
  });

  it('reports the last page correctly', async () => {
    const last = await getAdminProducts('', 3, 2);

    expect(last.products).toHaveLength(1);
    expect(last.hasNext).toBe(false);
    expect(last.hasPrev).toBe(true);
  });

  it('includes inactive products (unlike the storefront read)', async () => {
    await seed({ name: 'Archived', isActive: false });

    const result = await getAdminProducts('', 1, 50);

    expect(result.total).toBe(6);
    expect(result.products.map(p => p.name)).toContain('Archived');
  });

  it('searches name and description, case-insensitively', async () => {
    await seed({ name: 'Gymnastic Rings', description: 'wooden' });

    const byName = await getAdminProducts('gymnastic', 1, 50);
    const byDescription = await getAdminProducts('WOODEN', 1, 50);

    expect(byName.total).toBe(1);
    expect(byDescription.total).toBe(1);
  });
});

describe('createProduct', () => {
  it('adds a default Cairo cityPricing row when none is supplied', async () => {
    const created = await createProduct(productInput() as never);

    expect(created.cityPricing).toHaveLength(1);
    expect(created.cityPricing[0]).toMatchObject({
      governorate: 'Cairo',
      shippingCost: 50,
      codFee: 25,
      isActive: true,
    });
  });

  it('leaves supplied cityPricing untouched', async () => {
    const created = await createProduct(
      productInput({
        cityPricing: [
          { governorate: 'Alexandria', shippingCost: 75, codFee: 30, isActive: true },
        ],
      }) as never
    );

    expect(created.cityPricing).toHaveLength(1);
    expect(created.cityPricing[0].governorate).toBe('Alexandria');
  });
});

describe('updateProduct — the lost-update guard', () => {
  it('ignores a stock value sent by the admin form', async () => {
    const product = await seed({ stock: 10, variants: [] });

    await updateProduct(String(product._id), { name: 'Renamed', stock: 999 } as never);

    const after = await Product.findById(product._id).lean<{ name: string; stock: number }>();
    expect(after?.name).toBe('Renamed');
    // The form's stock number is discarded — stock only moves through the
    // optimistically-locked stock endpoint.
    expect(after?.stock).toBe(10);
  });

  it('keeps the database stock for each variant, matched by name', async () => {
    const product = await seed({
      stock: 7,
      variants: [
        { name: 'Small', stock: 3 },
        { name: 'Large', stock: 4 },
      ],
    });

    // The admin form posts the variants it loaded minutes ago, with stale stock.
    await updateProduct(String(product._id), {
      variants: [
        { name: 'Small', stock: 99 },
        { name: 'Large', stock: 99 },
      ],
    } as never);

    const after = await Product.findById(product._id).lean<{
      stock: number;
      variants: Array<{ name: string; stock: number }>;
    }>();
    const stockByName = Object.fromEntries((after?.variants ?? []).map(v => [v.name, v.stock]));

    expect(stockByName).toEqual({ Small: 3, Large: 4 });
    // The aggregate mirror is recomputed from the surviving variants.
    expect(after?.stock).toBe(7);
  });

  it('starts a newly added variant at zero stock', async () => {
    const product = await seed({ stock: 3, variants: [{ name: 'Small', stock: 3 }] });

    await updateProduct(String(product._id), {
      variants: [
        { name: 'Small', stock: 3 },
        { name: 'Medium', stock: 50 },
      ],
    } as never);

    const after = await Product.findById(product._id).lean<{
      stock: number;
      variants: Array<{ name: string; stock: number }>;
    }>();
    const stockByName = Object.fromEntries((after?.variants ?? []).map(v => [v.name, v.stock]));

    expect(stockByName).toEqual({ Small: 3, Medium: 0 });
    expect(after?.stock).toBe(3);
  });

  it('drops a removed variant and recomputes the total', async () => {
    const product = await seed({
      stock: 7,
      variants: [
        { name: 'Small', stock: 3 },
        { name: 'Large', stock: 4 },
      ],
    });

    await updateProduct(String(product._id), {
      variants: [{ name: 'Small', stock: 3 }],
    } as never);

    const after = await Product.findById(product._id).lean<{
      stock: number;
      variants: Array<{ name: string }>;
    }>();

    expect(after?.variants).toHaveLength(1);
    expect(after?.stock).toBe(3);
  });

  it('throws NotFoundError for an id that does not exist', async () => {
    const missing = new mongoose.Types.ObjectId().toString();

    await expect(updateProduct(missing, { name: 'x' } as never)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('deleteProduct', () => {
  it('removes the product', async () => {
    const product = await seed();

    await deleteProduct(String(product._id));

    expect(await Product.findById(product._id)).toBeNull();
  });

  it('throws NotFoundError for an id that does not exist', async () => {
    const missing = new mongoose.Types.ObjectId().toString();

    await expect(deleteProduct(missing)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('getProductById', () => {
  it('returns the product', async () => {
    const product = await seed({ name: 'Findable' });

    const found = await getProductById(String(product._id));

    expect(found.name).toBe('Findable');
  });

  it('returns inactive products too (the storefront filters, this does not)', async () => {
    const product = await seed({ name: 'Archived', isActive: false });

    await expect(getProductById(String(product._id))).resolves.toMatchObject({ name: 'Archived' });
  });

  it('throws NotFoundError for an id that does not exist', async () => {
    const missing = new mongoose.Types.ObjectId().toString();

    await expect(getProductById(missing)).rejects.toBeInstanceOf(NotFoundError);
  });
});
