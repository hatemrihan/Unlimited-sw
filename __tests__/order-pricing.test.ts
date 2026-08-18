/**
 * @jest-environment node
 *
 * Stage 4 regression suite: order money is computed from the database, never
 * taken from the request body.
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import Product from '@/product/model';
import Promo from '../models/promo';
import { computeOrderPricing, findPricingMismatches } from '../services/orderPricingService';

jest.setTimeout(120_000);

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'pricingtest' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Product.deleteMany({});
  await Promo.deleteMany({});
});

async function seedProduct(overrides: any = {}) {
  return Product.create({
    name: 'Test Hoodie',
    description: 'test',
    price: 500,
    mainImage: 'https://example.com/a.jpg',
    stock: 10,
    variants: [],
    ...overrides,
  });
}

function payload(products: any[], extra: any = {}) {
  return {
    customer: { name: 'A', email: 'a@b.com', phone: '1', address: 'x', governorate: 'Cairo' },
    paymentMethod: 'cashOnDelivery',
    products,
    ...extra,
  };
}

describe('price authority', () => {
  it('ignores a tampered price and uses the database value', async () => {
    const product = await seedProduct({ price: 500 });

    const result = await computeOrderPricing(
      payload([{ productId: String(product._id), name: 'Test Hoodie', price: 1, quantity: 2 }])
    );

    expect(result.success).toBe(true);
    expect(result.pricing!.lines[0].price).toBe(500);
    expect(result.pricing!.subtotal).toBe(1000);
    expect(result.pricing!.totalAmount).toBe(1000);
  });

  it('flags the tampered totals as a mismatch', async () => {
    const product = await seedProduct({ price: 500 });
    const body = payload(
      [{ productId: String(product._id), name: 'Test Hoodie', price: 1, quantity: 2 }],
      { subtotal: 2, shippingCost: 0, codFee: 0, totalAmount: 2 }
    );

    const result = await computeOrderPricing(body);
    const mismatches = findPricingMismatches(body, result.pricing!);

    expect(mismatches.map(m => m.field).sort()).toEqual(['subtotal', 'totalAmount']);
    expect(mismatches.find(m => m.field === 'totalAmount')).toMatchObject({ claimed: 2, computed: 1000 });
  });

  it('reports no mismatch for an honest payload', async () => {
    const product = await seedProduct({ price: 500 });
    const body = payload(
      [{ productId: String(product._id), name: 'Test Hoodie', price: 500, quantity: 2 }],
      { subtotal: 1000, shippingCost: 0, codFee: 0, totalAmount: 1000 }
    );

    const result = await computeOrderPricing(body);
    expect(findPricingMismatches(body, result.pricing!)).toEqual([]);
  });

  it('prefers a positive variant price over the base price', async () => {
    const product = await seedProduct({
      price: 500,
      variants: [
        { name: 'Premium', stock: 5, price: 800 },
        { name: 'Plain', stock: 5 },
      ],
    });

    const premium = await computeOrderPricing(
      payload([{ productId: String(product._id), name: 'X', price: 1, quantity: 1, variant: { name: 'Premium' } }])
    );
    expect(premium.pricing!.subtotal).toBe(800);

    // A variant with no price of its own falls back to the product price.
    const plain = await computeOrderPricing(
      payload([{ productId: String(product._id), name: 'X', price: 1, quantity: 1, size: 'Plain' }])
    );
    expect(plain.pricing!.subtotal).toBe(500);
  });

  it('rejects an order referencing a product that does not exist', async () => {
    const result = await computeOrderPricing(
      payload([{ productId: String(new mongoose.Types.ObjectId()), name: 'Ghost', price: 10, quantity: 1 }])
    );
    expect(result.success).toBe(false);
  });
});

describe('shipping and COD', () => {
  it('charges per-unit shipping and COD from the product city pricing', async () => {
    const product = await seedProduct({
      price: 100,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 50, codFee: 20, isActive: true }],
    });

    const result = await computeOrderPricing(
      payload([{ productId: String(product._id), name: 'X', price: 100, quantity: 3 }])
    );

    expect(result.pricing!.shippingCost).toBe(150);
    expect(result.pricing!.codFee).toBe(60);
    expect(result.pricing!.totalAmount).toBe(300 + 150 + 60);
  });

  it('charges no COD fee for instaPay', async () => {
    const product = await seedProduct({
      price: 100,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 50, codFee: 20, isActive: true }],
    });

    const result = await computeOrderPricing(
      payload([{ productId: String(product._id), name: 'X', price: 100, quantity: 1 }], { paymentMethod: 'instaPay' })
    );

    expect(result.pricing!.codFee).toBe(0);
    expect(result.pricing!.shippingCost).toBe(50);
  });

  it('ignores a deactivated governorate and an unknown one', async () => {
    const product = await seedProduct({
      price: 100,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 50, codFee: 20, isActive: false }],
    });

    const inactive = await computeOrderPricing(
      payload([{ productId: String(product._id), name: 'X', price: 100, quantity: 1 }])
    );
    expect(inactive.pricing!.shippingCost).toBe(0);

    const unknown = await computeOrderPricing(
      payload([{ productId: String(product._id), name: 'X', price: 100, quantity: 1 }], {
        customer: { name: 'A', email: 'a@b.com', phone: '1', address: 'x', governorate: 'Atlantis' },
      })
    );
    expect(unknown.pricing!.shippingCost).toBe(0);
  });
});

describe('promo re-validation', () => {
  it('recomputes the discount against the server subtotal, not the client one', async () => {
    const product = await seedProduct({ price: 1000 });
    await Promo.create({ code: 'HALF', discountType: 'percentage', discountValue: 50, isActive: true });

    const result = await computeOrderPricing(
      payload([{ productId: String(product._id), name: 'X', price: 1, quantity: 1 }], { promoCode: 'half' })
    );

    expect(result.pricing!.discountAmount).toBe(500);
    expect(result.pricing!.totalAmount).toBe(500);
    expect(result.pricing!.promoCode).toBe('HALF');
  });

  it('ignores an inactive promo code', async () => {
    const product = await seedProduct({ price: 1000 });
    await Promo.create({ code: 'DEAD', discountType: 'percentage', discountValue: 90, isActive: false });

    const result = await computeOrderPricing(
      payload([{ productId: String(product._id), name: 'X', price: 1, quantity: 1 }], { promoCode: 'DEAD' })
    );

    expect(result.pricing!.discountAmount).toBe(0);
    expect(result.pricing!.totalAmount).toBe(1000);
  });

  it('waives shipping when the promo says so', async () => {
    const product = await seedProduct({
      price: 1000,
      cityPricing: [{ governorate: 'Cairo', shippingCost: 60, codFee: 0, isActive: true }],
    });
    await Promo.create({ code: 'FREESHIP', discountType: 'fixed', discountValue: 0, isActive: true, waiveShipping: true });

    const result = await computeOrderPricing(
      payload([{ productId: String(product._id), name: 'X', price: 1000, quantity: 1 }], { promoCode: 'FREESHIP' })
    );

    expect(result.pricing!.shippingCost).toBe(0);
    expect(result.pricing!.totalAmount).toBe(1000);
  });

  it('never lets a discount drive the total negative', async () => {
    const product = await seedProduct({ price: 100 });
    await Promo.create({ code: 'HUGE', discountType: 'fixed', discountValue: 5000, isActive: true });

    const result = await computeOrderPricing(
      payload([{ productId: String(product._id), name: 'X', price: 100, quantity: 1 }], { promoCode: 'HUGE' })
    );

    expect(result.pricing!.totalAmount).toBe(0);
  });
});
