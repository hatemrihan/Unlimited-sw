import { ClientSession } from 'mongoose';
import ProductModel from '../models/product';
import { Product } from '../models/product';
import { CreateProductInput, UpdateProductInput } from '../lib/schemas/product.schema';

// ─── Interface ────────────────────────────────────────────────────────────────
// Defines the contract. Swap MongoProductRepository for any other implementation
// (PostgreSQL, in-memory mock, etc.) without touching service or route code.

export interface IProductRepository {
  findAllActive(fields: string): Promise<Product[]>;
  findFeatured(fields: string): Promise<Product[]>;
  findById(id: string, fields?: string): Promise<Product | null>;
  findAdminPage(query: object, skip: number, limit: number): Promise<Product[]>;
  countAdminPage(query: object): Promise<number>;
  create(data: CreateProductInput, session?: ClientSession): Promise<any>;
  updateById(id: string, data: UpdateProductInput): Promise<any>;
  deleteById(id: string): Promise<any>;
  toggleFeatured(id: string, isFeatured: boolean): Promise<any>;
}

// ─── Implementation ───────────────────────────────────────────────────────────

const PRODUCT_FIELDS =
  'name price originalPrice discount mainImage images videos description promoCode ' +
  'variants stock isActive isFeatured order showOutOfStockBadge showPreorderBadge ' +
  'customOutOfStockMessage category tags specifications shippingInfo faqs detailedDescription cityPricing';

export class MongoProductRepository implements IProductRepository {
  async findAllActive(fields: string = PRODUCT_FIELDS): Promise<Product[]> {
    return ProductModel.find({ isActive: true })
      .select(fields)
      .sort({ order: 1 })
      .lean()
      .exec() as unknown as Product[];
  }

  async findFeatured(fields: string = PRODUCT_FIELDS): Promise<Product[]> {
    return ProductModel.find({ isFeatured: true, isActive: true })
      .select(fields)
      .sort({ order: 1 })
      .lean()
      .exec() as unknown as Product[];
  }

  async findById(id: string, fields?: string): Promise<Product | null> {
    const q = ProductModel.findById(id);
    if (fields) q.select(fields);
    return q.lean().exec() as unknown as Product | null;
  }

  async findAdminPage(query: object, skip: number, limit: number): Promise<Product[]> {
    return ProductModel.find(query)
      .select(PRODUCT_FIELDS + ' createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as unknown as Product[];
  }

  async countAdminPage(query: object): Promise<number> {
    return ProductModel.countDocuments(query);
  }

  async create(data: CreateProductInput, session?: ClientSession): Promise<any> {
    const doc = new ProductModel(data);
    return session ? doc.save({ session }) : doc.save();
  }

  async updateById(id: string, data: UpdateProductInput): Promise<any> {
    return ProductModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async deleteById(id: string): Promise<any> {
    return ProductModel.findByIdAndDelete(id);
  }

  async toggleFeatured(id: string, isFeatured: boolean): Promise<any> {
    return ProductModel.findByIdAndUpdate(
      id,
      { isFeatured },
      { new: true, runValidators: true }
    );
  }
}

// Singleton — reuse across requests (no re-instantiation per request)
export const productRepository = new MongoProductRepository();
