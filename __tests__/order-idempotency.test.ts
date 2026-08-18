/**
 * @jest-environment node
 *
 * Placing the same order twice.
 *
 * The failure this prevents: a customer on a slow mobile network presses
 * "Place order", the request reaches the server and commits, and the RESPONSE
 * is lost on the way back. They press again. Nothing on the server could tell
 * the retry apart from a second purchase, so it became one — a second order
 * row, a second stock reservation against the same items, a second promo use,
 * and two confirmation emails for one customer who bought one thing.
 *
 * `isSubmitting` on the button does not help: it lives in a page that may have
 * been reloaded, and it cannot see a request that already succeeded.
 *
 * The fix is a `clientOrderId` minted by the browser once per checkout attempt,
 * with a unique index behind it. The tests below pin the two things that makes
 * true: the duplicate is refused at the database, and the loser's transaction
 * takes its stock reservation down with it.
 *
 * Transactions require a replica set, so this runs against an in-memory
 * single-node replica set rather than a standalone mongod.
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// createOrderTransaction calls dbConnect(); the suite owns the connection instead.
jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import Product from '@/product/model';
import Order from '@/order/model';
import {
  createOrderTransaction,
  findOrderByClientId,
  resolveVariantName,
} from '../services/orderCreationService';

jest.setTimeout(120_000);

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'idempotencytest' });
  // The guard is the unique index, so the index must actually be built.
  await Order.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
});

async function seedProduct(stock: number) {
  return Product.create({
    name: 'Test Hoodie',
    description: 'test',
    price: 100,
    mainImage: 'https://example.com/a.jpg',
    stock,
    variants: [],
  });
}

function orderPayload(productId: string, quantity: number) {
  return {
    products: [{ productId, name: 'Test Hoodie', price: 100, quantity }],
    customer: { name: 'A', email: 'a@b.com', phone: '1', address: 'x' },
  };
}

function newOrderDoc(productId: string, quantity: number, clientOrderId?: string) {
  return {
    customer: { name: 'A', email: 'a@b.com', phone: '1', address: 'x' },
    products: [
      {
        productId,
        name: 'Test Hoodie',
        price: 100,
        quantity,
        variantName: resolveVariantName({ productId, quantity }),
        image: 'https://example.com/a.jpg',
      },
    ],
    paymentMethod: 'cashOnDelivery',
    totalAmount: 100 * quantity,
    subtotal: 100 * quantity,
    shippingCost: 0,
    status: 'pending',
    orderDate: new Date(),
    clientOrderId,
  } as any;
}

/** One checkout attempt, as the route makes it. */
async function placeOrder(productId: string, quantity: number, clientOrderId?: string) {
  return createOrderTransaction(
    orderPayload(productId, quantity),
    newOrderDoc(productId, quantity, clientOrderId)
  );
}

describe('the clientOrderId index', () => {
  it('is unique, so two orders can never carry the same one', async () => {
    const indexes = await Order.collection.indexes();
    const guard = indexes.find(index => index.key?.clientOrderId === 1);

    expect(guard).toBeDefined();
    expect(guard!.unique).toBe(true);
  });

  it('is sparse, so the orders already in the database do not all collide on null', async () => {
    const indexes = await Order.collection.indexes();
    const guard = indexes.find(index => index.key?.clientOrderId === 1);

    expect(guard!.sparse).toBe(true);
  });

  it('lets any number of orders through without one', async () => {
    // Older cached pages send no id at all. They must still be able to check out.
    const product = await seedProduct(10);

    const first = await placeOrder(product._id.toString(), 1);
    const second = await placeOrder(product._id.toString(), 1);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(await Order.countDocuments({})).toBe(2);
  });
});

describe('a retried checkout', () => {
  it('is refused as a duplicate rather than becoming a second order', async () => {
    const product = await seedProduct(10);
    const attempt = 'a1b2c3d4-retry';

    const first = await placeOrder(product._id.toString(), 2, attempt);
    const retry = await placeOrder(product._id.toString(), 2, attempt);

    expect(first.success).toBe(true);
    expect(retry.success).toBe(false);
    expect(retry.duplicate).toBe(true);
    expect(await Order.countDocuments({})).toBe(1);
  });

  it('does not reserve the stock a second time', async () => {
    // This is the damage the duplicate does: the items are held twice, and the
    // storefront tells real customers they are sold out.
    const product = await seedProduct(10);
    const attempt = 'a1b2c3d4-stock';

    await placeOrder(product._id.toString(), 3, attempt);
    await placeOrder(product._id.toString(), 3, attempt);

    const after = await Product.findById(product._id).lean<{ stock: number }>();
    expect(after!.stock).toBe(7);
  });

  it('can be answered with the order that already exists', async () => {
    const product = await seedProduct(10);
    const attempt = 'a1b2c3d4-lookup';

    const first = await placeOrder(product._id.toString(), 1, attempt);
    const existing = await findOrderByClientId(attempt);

    expect(existing).not.toBeNull();
    expect(existing!.orderId).toBe(first.savedOrder.orderId);
  });

  it('leaves a genuine second purchase alone', async () => {
    // A customer who really does order twice mints a new id each time.
    const product = await seedProduct(10);

    const first = await placeOrder(product._id.toString(), 1, 'attempt-one');
    const second = await placeOrder(product._id.toString(), 1, 'attempt-two');

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(await Order.countDocuments({})).toBe(2);

    const after = await Product.findById(product._id).lean<{ stock: number }>();
    expect(after!.stock).toBe(8);
  });
});

describe('findOrderByClientId', () => {
  it('finds nothing for an id that was never used', async () => {
    expect(await findOrderByClientId('never-seen')).toBeNull();
  });

  it('finds nothing for an empty id, rather than matching every order without one', async () => {
    // Orders placed without a clientOrderId store no value at all. A blank
    // lookup must not hand a stranger's order back to whoever asked.
    const product = await seedProduct(10);
    await placeOrder(product._id.toString(), 1);

    expect(await findOrderByClientId('')).toBeNull();
    expect(await findOrderByClientId(undefined)).toBeNull();
  });
});
