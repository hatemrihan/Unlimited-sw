/**
 * @jest-environment node
 *
 * Stage 3 regression suite: stock returns to inventory when an order is
 * cancelled or deleted, exactly once.
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import Product from '@/product/model';
import Order from '@/order/model';
import { createOrderTransaction, resolveVariantName } from '../services/orderCreationService';
import {
  restoreStockForOrder,
  reapplyStockForOrder,
  deleteOrderWithStockRestoration,
} from '../services/stockRestorationService';

jest.setTimeout(120_000);

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'restoretest' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
});

async function seedProduct(overrides: any = {}) {
  return Product.create({
    name: 'Test Hoodie',
    description: 'test',
    price: 100,
    mainImage: 'https://example.com/a.jpg',
    stock: 0,
    variants: [],
    ...overrides,
  });
}

async function placeOrder(products: any[]) {
  const orderData = { products, customer: { name: 'A', email: 'a@b.com', phone: '1', address: 'x' } };
  const newOrder: any = {
    customer: orderData.customer,
    products: products.map((p: any) => ({
      productId: p.productId,
      name: p.name,
      price: p.price,
      quantity: p.quantity,
      variantName: resolveVariantName(p),
      size: p.size,
      image: 'https://example.com/a.jpg',
    })),
    paymentMethod: 'cashOnDelivery',
    totalAmount: 100,
    subtotal: 100,
    shippingCost: 0,
    status: 'pending',
    orderDate: new Date(),
  };
  const result = await createOrderTransaction(orderData, newOrder);
  expect(result.success).toBe(true);
  return result.savedOrder;
}

describe('cancel restock', () => {
  it('returns variant and mirror stock on cancel, and does not double-return on a second cancel', async () => {
    const product = await seedProduct({ stock: 10, variants: [{ name: 'Red', stock: 10 }] });
    const order = await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 3, variant: { name: 'Red' } },
    ]);

    let after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(7);
    expect(after.stock).toBe(7);

    const first = await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });
    expect(first.success).toBe(true);

    after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(10);
    expect(after.stock).toBe(10);
    expect((await Order.findById(order._id))!.stockRestored).toBe(true);
    expect((await Order.findById(order._id))!.status).toBe('cancelled');

    // Idempotency guard: cancelling again must not inflate inventory.
    const second = await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });
    expect(second.success).toBe(true);

    after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(10);
    expect(after.stock).toBe(10);
  });

  it('restocks variant-less products', async () => {
    const product = await seedProduct({ stock: 5, variants: [] });
    const order = await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 2 },
    ]);

    expect((await Product.findById(product._id)).stock).toBe(3);
    await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });
    expect((await Product.findById(product._id)).stock).toBe(5);
  });

  it('restocks a legacy order that only carries size, not variantName', async () => {
    const product = await seedProduct({ stock: 10, variants: [{ name: 'Large', stock: 10 }] });
    const order = await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 4, size: 'Large' },
    ]);

    // Simulate an order written before variantName existed.
    await Order.updateOne({ _id: order._id }, { $unset: { 'products.0.variantName': '' } });

    await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });

    const after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(10);
    expect(after.stock).toBe(10);
  });
});

describe('un-cancel', () => {
  it('re-reserves stock when a cancelled order is moved back to confirmed', async () => {
    const product = await seedProduct({ stock: 10, variants: [{ name: 'Red', stock: 10 }] });
    const order = await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 3, variant: { name: 'Red' } },
    ]);

    await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });
    const result = await reapplyStockForOrder(String(order._id), 'confirmed');
    expect(result.success).toBe(true);

    const after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(7);
    expect(after.stock).toBe(7);

    const reloaded = (await Order.findById(order._id))!;
    expect(reloaded.stockRestored).toBe(false);
    expect(reloaded.status).toBe('confirmed');
  });

  it('refuses the status change when stock can no longer cover the order', async () => {
    const product = await seedProduct({ stock: 10, variants: [{ name: 'Red', stock: 10 }] });
    const order = await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 3, variant: { name: 'Red' } },
    ]);
    await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });

    // Someone else buys the stock in the meantime.
    await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 9, variant: { name: 'Red' } },
    ]);

    const result = await reapplyStockForOrder(String(order._id), 'confirmed');
    expect(result.success).toBe(false);
    expect(result.insufficient).toBe(true);

    // The order must stay cancelled and inventory must be untouched.
    const reloaded = (await Order.findById(order._id))!;
    expect(reloaded.status).toBe('cancelled');
    expect(reloaded.stockRestored).toBe(true);

    const after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(1);
    expect(after.stock).toBe(1);
  });
});

describe('delete restock', () => {
  it('returns stock when deleting a live order', async () => {
    const product = await seedProduct({ stock: 10, variants: [{ name: 'Red', stock: 10 }] });
    const order = await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 2, variant: { name: 'Red' } },
    ]);

    const result = await deleteOrderWithStockRestoration(String(order._id));
    expect(result.success).toBe(true);

    const after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(10);
    expect(after.stock).toBe(10);
    expect(await Order.findById(order._id)).toBeNull();
  });

  it('does not restock again when deleting an already-cancelled order', async () => {
    const product = await seedProduct({ stock: 10, variants: [{ name: 'Red', stock: 10 }] });
    const order = await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 2, variant: { name: 'Red' } },
    ]);
    await restoreStockForOrder(String(order._id), { newStatus: 'cancelled' });

    await deleteOrderWithStockRestoration(String(order._id));

    const after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(10);
    expect(after.stock).toBe(10);
  });

  it('reports notFound for a missing order', async () => {
    const result = await deleteOrderWithStockRestoration(String(new mongoose.Types.ObjectId()));
    expect(result.notFound).toBe(true);
  });
});
