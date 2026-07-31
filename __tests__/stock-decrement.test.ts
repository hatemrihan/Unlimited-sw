/**
 * @jest-environment node
 *
 * Stage 1 regression suite for the stock engine.
 *
 * Transactions require a replica set, so these run against an in-memory
 * single-node replica set rather than a standalone mongod.
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// createOrderTransaction calls dbConnect(); the suite owns the connection instead.
jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import Product from '../models/product';
import Order from '../models/order';
import { createOrderTransaction, resolveVariantName, resolveLegacyProductIds } from '../services/orderCreationService';

jest.setTimeout(120_000);

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'stocktest' });
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

function orderPayload(products: any[]) {
  return {
    products,
    customer: { name: 'A', email: 'a@b.com', phone: '1', address: 'x' },
  };
}

function newOrderDoc(products: any[]) {
  return {
    customer: { name: 'A', email: 'a@b.com', phone: '1', address: 'x' },
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
  } as any;
}

async function placeOrder(products: any[]) {
  return createOrderTransaction(orderPayload(products), newOrderDoc(products), 0);
}

describe('variant stock decrement', () => {
  it('decrements the ordered variant and the product.stock mirror by the same quantity', async () => {
    const product = await seedProduct({
      stock: 60,
      variants: [
        { name: 'Red', stock: 50 },
        { name: 'Blue', stock: 10 },
      ],
    });

    const result = await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 2, variant: { name: 'Red' } },
    ]);

    expect(result.success).toBe(true);

    const after = await Product.findById(product._id);
    expect(after.variants.find((v: any) => v.name === 'Red').stock).toBe(48);
    expect(after.variants.find((v: any) => v.name === 'Blue').stock).toBe(10);
    expect(after.stock).toBe(58);
  });

  it('rejects an order for an out-of-stock variant instead of debiting a different one', async () => {
    // The pre-$elemMatch query matched this product because 'variants.stock >= 1'
    // was satisfied by Red while 'variants.name' matched Black.
    const product = await seedProduct({
      stock: 50,
      variants: [
        { name: 'Black', stock: 0 },
        { name: 'Red', stock: 50 },
      ],
    });

    const result = await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 1, variant: { name: 'Black' } },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Black');

    const after = await Product.findById(product._id);
    expect(after.variants.find((v: any) => v.name === 'Black').stock).toBe(0);
    expect(after.variants.find((v: any) => v.name === 'Red').stock).toBe(50);
    expect(after.stock).toBe(50);
    expect(await Order.countDocuments({})).toBe(0);
  });

  it('decrements the right variant for a legacy size-only payload with no variant object', async () => {
    const product = await seedProduct({
      stock: 30,
      variants: [
        { name: 'Large', stock: 20 },
        { name: 'Small', stock: 10 },
      ],
    });

    const result = await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 3, size: 'Large' },
    ]);

    expect(result.success).toBe(true);

    const after = await Product.findById(product._id);
    expect(after.variants.find((v: any) => v.name === 'Large').stock).toBe(17);
    expect(after.variants.find((v: any) => v.name === 'Small').stock).toBe(10);
    expect(after.stock).toBe(27);
  });

  it('persists variantName on the order record', async () => {
    const product = await seedProduct({ stock: 5, variants: [{ name: 'Red', stock: 5 }] });

    await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 1, size: 'Red' },
    ]);

    const order = await Order.findOne({});
    expect(order!.products[0].variantName).toBe('Red');
  });
});

describe('concurrency', () => {
  it('lets exactly one of two simultaneous orders take the last unit', async () => {
    const product = await seedProduct({ stock: 1, variants: [{ name: 'Red', stock: 1 }] });

    const line = { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 1, variant: { name: 'Red' } };
    const results = await Promise.all([placeOrder([line]), placeOrder([line])]);

    expect(results.filter(r => r.success)).toHaveLength(1);

    const after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(0);
    expect(after.stock).toBe(0);
    expect(await Order.countDocuments({})).toBe(1);
  });
});

describe('transaction rollback', () => {
  it('restores the first line item when a later line item is out of stock', async () => {
    const inStock = await seedProduct({ stock: 10, variants: [{ name: 'Red', stock: 10 }] });
    const soldOut = await seedProduct({ name: 'Sold Out Tee', stock: 0, variants: [{ name: 'Red', stock: 0 }] });

    const result = await placeOrder([
      { productId: String(inStock._id), name: 'Test Hoodie', price: 100, quantity: 2, variant: { name: 'Red' } },
      { productId: String(soldOut._id), name: 'Sold Out Tee', price: 100, quantity: 1, variant: { name: 'Red' } },
    ]);

    expect(result.success).toBe(false);

    const after = await Product.findById(inStock._id);
    expect(after.variants[0].stock).toBe(10);
    expect(after.stock).toBe(10);
    expect(await Order.countDocuments({})).toBe(0);
  });
});

describe('legacy product id migration', () => {
  it('rewrites a legacy id to the real product when the name matches exactly one product', async () => {
    const product = await seedProduct({ name: 'Legacy Hoodie', stock: 10, variants: [{ name: 'Red', stock: 10 }] });

    const orderData = {
      products: [{ productId: 'static-product-1', name: 'Legacy Hoodie', price: 100, quantity: 2, variant: { name: 'Red' } }],
    };

    const unresolved = await resolveLegacyProductIds(orderData);

    expect(unresolved).toHaveLength(0);
    expect(orderData.products[0].productId).toBe(String(product._id));

    // And the migrated payload then decrements normally.
    const result = await placeOrder(orderData.products);
    expect(result.success).toBe(true);
    const after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(8);
  });

  it('reports a legacy id whose name matches nothing', async () => {
    const orderData = { products: [{ productId: 'static-product-9', name: 'Ghost Product', quantity: 1 }] };
    const unresolved = await resolveLegacyProductIds(orderData);
    expect(unresolved).toHaveLength(1);
    expect(orderData.products[0].productId).toBe('static-product-9');
  });

  it('refuses to guess when two products share the name', async () => {
    await seedProduct({ name: 'Duplicate Name', stock: 5, variants: [] });
    await seedProduct({ name: 'Duplicate Name', stock: 5, variants: [] });

    const orderData = { products: [{ productId: 'static-product-2', name: 'Duplicate Name', quantity: 1 }] };
    const unresolved = await resolveLegacyProductIds(orderData);

    expect(unresolved).toHaveLength(1);
    expect(orderData.products[0].productId).toBe('static-product-2');
  });

  it('leaves valid ids untouched and does nothing when there are none', async () => {
    const product = await seedProduct({ stock: 5, variants: [] });
    const orderData = { products: [{ productId: String(product._id), name: 'Test Hoodie', quantity: 1 }] };

    expect(await resolveLegacyProductIds(orderData)).toHaveLength(0);
    expect(orderData.products[0].productId).toBe(String(product._id));
  });
});

describe('legacy product ids', () => {
  it('rejects an order for a non-MongoDB product id instead of selling untracked stock', async () => {
    const product = await seedProduct({ stock: 10, variants: [{ name: 'Red', stock: 10 }] });

    const result = await placeOrder([
      { productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: 1, variant: { name: 'Red' } },
      { productId: 'static-product-1', name: 'Legacy Item', price: 100, quantity: 1 },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Legacy Item');

    // The valid line must be rolled back with it.
    const after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(10);
    expect(after.stock).toBe(10);
    expect(await Order.countDocuments({})).toBe(0);
  });
});

describe('variant-less products', () => {
  it('decrements product.stock and rejects when it would go negative', async () => {
    const product = await seedProduct({ stock: 3, variants: [] });
    const line = (qty: number) => ({ productId: String(product._id), name: 'Test Hoodie', price: 100, quantity: qty });

    expect((await placeOrder([line(2)])).success).toBe(true);
    expect((await Product.findById(product._id)).stock).toBe(1);

    expect((await placeOrder([line(2)])).success).toBe(false);
    expect((await Product.findById(product._id)).stock).toBe(1);
  });
});
