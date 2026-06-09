import { ClientSession } from 'mongoose';
import ProductModel from '../models/product';
import { Product } from '../models/product';
import { CreateProductInput, UpdateProductInput } from '../lib/schemas/product.schema';
import dbConnect from '../lib/mongodb';

// ─── Interface ────────────────────────────────────────────────────────────────
// Defines the contract. Swap MongoProductRepository for any other implementation
// (PostgreSQL, in-memory mock, etc.) without touching service or route code.

export interface IProductRepository {
  findAllActive(fields: string): Promise<Product[]>;

  findById(id: string, fields?: string): Promise<Product | null>;
  findAdminPage(query: object, skip: number, limit: number): Promise<Product[]>;
  countAdminPage(query: object): Promise<number>;
  create(data: CreateProductInput, session?: ClientSession): Promise<any>;
  updateById(id: string, data: UpdateProductInput): Promise<any>;
  deleteById(id: string): Promise<any>;

}

// ─── Implementation ───────────────────────────────────────────────────────────
//
// CRITICAL: Every method calls `await dbConnect()` FIRST.
// This is required because `bufferCommands: false` in our Mongoose config
// means queries throw immediately if the connection isn't ready.
// Without this, API routes that call the service layer (which calls here)
// would crash on cold start before MongoDB finishes connecting.
// The dbConnect() function is idempotent — if already connected, it returns instantly.

const PRODUCT_FIELDS =
  'name price originalPrice discount mainImage images videos description promoCode ' +
  'variants stock isActive order showOutOfStockBadge showPreorderBadge ' +
  'customOutOfStockMessage category tags specifications shippingInfo faqs detailedDescription cityPricing';

export class MongoProductRepository implements IProductRepository {
  async findAllActive(fields: string = PRODUCT_FIELDS): Promise<Product[]> {
    await dbConnect();
    return ProductModel.find({ isActive: true })
      .select(fields)
      .sort({ price: 1 })
      .lean()
      .exec() as unknown as Product[];
  }

  async findById(id: string, fields?: string): Promise<Product | null> {
    await dbConnect();
    const q = ProductModel.findById(id);
    if (fields) q.select(fields);
    return q.lean().exec() as unknown as Product | null;
  }

  async findAdminPage(query: object, skip: number, limit: number): Promise<Product[]> {
    await dbConnect();
    return ProductModel.find(query)
      .select(PRODUCT_FIELDS + ' createdAt updatedAt')
      .sort({ price: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as unknown as Product[];
  }

  async countAdminPage(query: object): Promise<number> {
    await dbConnect();
    return ProductModel.countDocuments(query);
  }

  async create(data: CreateProductInput, session?: ClientSession): Promise<any> {
    await dbConnect();
    const doc = new ProductModel(data);
    return session ? doc.save({ session }) : doc.save();
  }

  async updateById(id: string, data: UpdateProductInput): Promise<any> {
    await dbConnect();
    return ProductModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async deleteById(id: string): Promise<any> {
    await dbConnect();
    return ProductModel.findByIdAndDelete(id);
  }


}

// Singleton — reuse across requests (no re-instantiation per request)
export const productRepository = new MongoProductRepository();
