/**
 * @jest-environment node
 *
 * Proves the storefront read actually uses an index instead of sorting in memory.
 *
 * This is the one test that can tell us the shop is fast, rather than assuming
 * it. It asks MongoDB to explain its own plan: a SORT stage in that plan means
 * the database is ordering products by hand on every request.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import Product from '../product/model';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'indextest' });
  // Indexes are declared on the schema; this is what actually builds them.
  await Product.syncIndexes();

  for (let i = 1; i <= 30; i++) {
    await Product.create({
      name: `Product ${i}`,
      description: 'test',
      price: i * 10,
      mainImage: 'https://example.com/a.jpg',
      stock: 0,
      variants: [],
      isActive: i % 5 !== 0,
    });
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

/** Walks a query plan and collects every stage name. */
function stageNames(plan: Record<string, any> | undefined): string[] {
  if (!plan) return [];
  const names = [plan.stage as string].filter(Boolean);
  for (const child of plan.inputStage ? [plan.inputStage] : plan.inputStages ?? []) {
    names.push(...stageNames(child));
  }
  return names;
}

describe('product indexes', () => {
  it('declares an index matching the storefront filter and sort', async () => {
    const indexes = await Product.collection.indexes();
    const keys = indexes.map(index => JSON.stringify(index.key));

    expect(keys).toContain(JSON.stringify({ isActive: 1, price: 1 }));
  });

  it('sorts the storefront listing with the index, not in memory', async () => {
    const explained = await Product.find({ isActive: true })
      .sort({ price: 1 })
      .limit(20)
      .explain('queryPlanner');

    const stages = stageNames((explained as any).queryPlanner?.winningPlan);

    // A SORT stage means MongoDB ordered the results itself, in memory, on this
    // request. With the right index the ordering comes free from the index scan.
    expect(stages).not.toContain('SORT');
    expect(stages).toContain('IXSCAN');
  });

  it('still returns products cheapest first', async () => {
    const products = await Product.find({ isActive: true }).sort({ price: 1 }).limit(5).lean();

    const prices = products.map((p: any) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  // ─── Phase 2 ───────────────────────────────────────────────────────────────

  it('declares unique sparse indexes on both slugs', async () => {
    const indexes = await Product.collection.indexes();

    for (const field of ['slug', 'slugAr']) {
      const index = indexes.find(i => JSON.stringify(i.key) === JSON.stringify({ [field]: 1 }));
      expect(index).toBeDefined();
      expect(index!.unique).toBe(true);
      // Without sparse this index cannot even be built — see below.
      expect(index!.sparse).toBe(true);
    }
  });

  it('lets many products coexist with no slug at all', async () => {
    // The 30 products above were all created without a slug. A unique index that
    // was not sparse would read them as 30 documents sharing the value `null`
    // and refuse to build — which is exactly what would happen on the live
    // collection, where every product predates the field.
    const withoutSlug = await Product.countDocuments({ slug: { $exists: false } });
    expect(withoutSlug).toBeGreaterThan(1);
  });

  it('refuses two products with the same slug', async () => {
    await Product.create({
      name: 'Slug Original', description: 'test', price: 10,
      mainImage: 'https://example.com/a.jpg', slug: 'duplicate-me',
    });

    await expect(
      Product.create({
        name: 'Slug Impostor', description: 'test', price: 20,
        mainImage: 'https://example.com/b.jpg', slug: 'duplicate-me',
      })
    ).rejects.toThrow(/duplicate key/i);
  });

  it('refuses two products with the same Arabic slug', async () => {
    await Product.create({
      name: 'Arabic Original', description: 'test', price: 10,
      mainImage: 'https://example.com/a.jpg', slugAr: 'بارليتس-أرضي',
    });

    await expect(
      Product.create({
        name: 'Arabic Impostor', description: 'test', price: 20,
        mainImage: 'https://example.com/b.jpg', slugAr: 'بارليتس-أرضي',
      })
    ).rejects.toThrow(/duplicate key/i);
  });

  it('finds a product by its Arabic slug', async () => {
    const found = await Product.findOne({ slugAr: 'بارليتس-أرضي' }).lean();
    expect((found as any)?.name).toBe('Arabic Original');
  });

  it('sorts a category listing with the index, not in memory', async () => {
    const explained = await Product.find({ category: 'parallettes', isActive: true })
      .sort({ price: 1 })
      .explain('queryPlanner');

    const stages = stageNames((explained as any).queryPlanner?.winningPlan);

    expect(stages).not.toContain('SORT');
    expect(stages).toContain('IXSCAN');
  });
});
