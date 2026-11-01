/**
 * @jest-environment node
 *
 * Proves the optional per-customer limit on a promo code (30 Oct 2026):
 * one phone number may use a limited code N times, written in any of the
 * three ways Egyptians write a number, and codes without the limit are
 * unaffected.
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import Product from '@/product/model';
import Order from '@/order/model';
import Promo from '../models/promo';
import { createOrderTransaction, resolveVariantName } from '../services/orderCreationService';

jest.setTimeout(120_000);

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'promopercustomertest' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
  await Promo.deleteMany({});
});

async function seedProduct() {
  return Product.create({
    name: 'Test Bar',
    description: 'test',
    price: 100,
    mainImage: 'https://example.com/a.jpg',
    stock: 50,
    variants: [],
  });
}

async function place(productId: string, phone: string, promoCode = 'FIRST') {
  const products = [{ productId, name: 'Test Bar', price: 100, quantity: 1 }];
  const orderData = { products, customer: { name: 'A', email: 'a@b.com', phone, address: 'x' } };
  const newOrder: any = {
    customer: orderData.customer,
    products: products.map((p: any) => ({ ...p, variantName: resolveVariantName(p), image: 'https://example.com/a.jpg' })),
    paymentMethod: 'cashOnDelivery',
    totalAmount: 90,
    subtotal: 100,
    shippingCost: 0,
    promoCode,
    discountAmount: 10,
    status: 'pending',
    orderDate: new Date(),
  };
  return createOrderTransaction(orderData, newOrder, promoCode);
}

describe('per-customer promo limit', () => {
  it('lets a phone number use a "once per customer" code once, however the number is written', async () => {
    await Promo.create({ code: 'FIRST', discountType: 'percentage', discountValue: 10, perCustomerLimit: 1 });
    const product = await seedProduct();

    expect((await place(String(product._id), '01012345678')).success).toBe(true);

    const again = await place(String(product._id), '+201012345678');
    expect(again.success).toBe(false);
    expect(again.error).toMatch(/maximum number of times/);

    // The refused attempt took nothing: one order, one use.
    expect(await Order.countDocuments({})).toBe(1);
    expect((await Promo.findOne({ code: 'FIRST' }).lean<{ usedCount: number }>())?.usedCount).toBe(1);
  });

  it('still lets a different customer use it', async () => {
    await Promo.create({ code: 'FIRST', discountType: 'percentage', discountValue: 10, perCustomerLimit: 1 });
    const product = await seedProduct();

    expect((await place(String(product._id), '01012345678')).success).toBe(true);
    expect((await place(String(product._id), '01198765432')).success).toBe(true);
  });

  it('leaves codes without the limit unlimited per customer, as before', async () => {
    await Promo.create({ code: 'FIRST', discountType: 'percentage', discountValue: 10 });
    const product = await seedProduct();

    for (let i = 0; i < 3; i++) {
      expect((await place(String(product._id), '01012345678')).success).toBe(true);
    }
  });
});
