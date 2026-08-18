/**
 * @jest-environment node
 *
 * Proves the admin order list reads with an index instead of sorting the whole
 * collection in memory.
 *
 * The bug this covers: the Order collection had NO indexes beyond `_id` and the
 * unique `orderId`. `GET /api/orders` runs `find({}).sort({ createdAt: -1 })` on
 * every dashboard load, so MongoDB sorted every order in memory, every time —
 * capped at 32 MB, after which the dashboard simply stops loading.
 *
 * Like the product equivalent, this asks MongoDB to explain its own plan rather
 * than assuming. A SORT stage in that plan means we are back to sorting by hand.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import Order from '@/order/model';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'orderindextest' });
  // Indexes are declared on the schema; this is what actually builds them.
  await Order.syncIndexes();

  const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

  for (let i = 1; i <= 40; i++) {
    await Order.create({
      customer: {
        name: `Customer ${i}`,
        email: `customer${i}@example.com`,
        phone: `0101234${String(i).padStart(4, '0')}`,
        address: `${i} Test Street`,
      },
      products: [{
        productId: '507f1f77bcf86cd799439011',
        name: 'Hoodie',
        price: 100,
        quantity: 1,
        image: 'https://example.com/a.jpg',
      }],
      paymentMethod: 'cashOnDelivery',
      totalAmount: i * 10,
      subtotal: i * 10,
      shippingCost: 0,
      status: statuses[i % statuses.length],
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

async function planFor(query: mongoose.Query<any, any>) {
  const explained = await query.explain('queryPlanner');
  return stageNames((explained as any).queryPlanner?.winningPlan);
}

describe('order indexes', () => {
  it('declares the indexes the admin list depends on', async () => {
    const indexes = await Order.collection.indexes();
    const keys = indexes.map(index => JSON.stringify(index.key));

    expect(keys).toContain(JSON.stringify({ createdAt: -1 }));
    expect(keys).toContain(JSON.stringify({ status: 1, createdAt: -1 }));
    expect(keys).toContain(JSON.stringify({ 'customer.phone': 1 }));
    expect(keys).toContain(JSON.stringify({ 'customer.email': 1 }));
  });

  it('sorts the default admin list with the index, not in memory', async () => {
    // This is the exact query GET /api/orders issues on every dashboard load.
    const stages = await planFor(
      Order.find({}).sort({ createdAt: -1 }).skip(0).limit(50) as any
    );

    expect(stages).toContain('IXSCAN');
    expect(stages).not.toContain('SORT');
  });

  it('sorts a status-filtered list with the index too', async () => {
    const stages = await planFor(
      Order.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(50) as any
    );

    expect(stages).toContain('IXSCAN');
    expect(stages).not.toContain('SORT');
  });

  it('sorts by total without an in-memory sort', async () => {
    const stages = await planFor(
      Order.find({}).sort({ totalAmount: -1 }).limit(50) as any
    );

    expect(stages).toContain('IXSCAN');
    expect(stages).not.toContain('SORT');
  });

  it('looks a phone number up by index rather than scanning', async () => {
    const stages = await planFor(
      Order.find({ 'customer.phone': { $regex: '^01012340005' } }) as any
    );

    expect(stages).toContain('IXSCAN');
  });

  it('looks an email up by index rather than scanning', async () => {
    const stages = await planFor(
      Order.find({ 'customer.email': { $regex: '^customer7@', $options: 'i' } }) as any
    );

    expect(stages).toContain('IXSCAN');
  });
});
