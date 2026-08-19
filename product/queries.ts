import { ClientSession, Types } from 'mongoose';
import ProductModel from '@/product/model';
import { Product } from '@/product/model';
import { CreateProductInput, UpdateProductInput } from '@/product/schema';
import dbConnect from '@/lib/mongodb';

// ─── Interface ────────────────────────────────────────────────────────────────
// Defines the contract. Swap MongoProductQueries for any other implementation
// (PostgreSQL, in-memory mock, etc.) without touching service or route code.

export interface ProductQueries {
  findAllActive(fields: string): Promise<Product[]>;

  findById(id: string, fields?: string): Promise<Product | null>;
  /**
   * Looks a product up by its public URL segment.
   *
   * `locale` picks which slug field to match, so the Arabic route cannot
   * accidentally resolve an English slug and serve a page whose URL says one
   * thing and whose canonical says another.
   */
  findBySlug(slug: string, locale: 'en' | 'ar'): Promise<Product | null>;
  /** Active products in one category, cheapest first. */
  findByCategory(category: string): Promise<Product[]>;
  findByIds(ids: string[]): Promise<Product[]>;
  /** Other active products to show beneath one, in the admin's own order. */
  findRelated(excludeId: string, limit: number): Promise<Product[]>;
  findActivePage(skip: number, limit: number): Promise<Product[]>;
  countActive(): Promise<number>;
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
  'customOutOfStockMessage category tags specifications shippingInfo faqs detailedDescription cityPricing ' +
  // Phase 2. A field missing from this list is silently absent on every page
  // that reads through the cache — the Arabic pages would render English with
  // no error anywhere.
  'slug slugAr nameAr descriptionAr detailedDescriptionAr specificationsAr faqsAr ' +
  'seoTitle seoTitleAr seoDescription seoDescriptionAr';

export class MongoProductQueries implements ProductQueries {
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

  async findBySlug(slug: string, locale: 'en' | 'ar'): Promise<Product | null> {
    await dbConnect();
    const field = locale === 'ar' ? 'slugAr' : 'slug';
    return ProductModel.findOne({ [field]: slug, isActive: true })
      .select(PRODUCT_FIELDS)
      .lean()
      .exec() as unknown as Product | null;
  }

  async findByCategory(category: string): Promise<Product[]> {
    await dbConnect();
    // Matches the { category, isActive, price } index — the sort is free.
    return ProductModel.find({ category, isActive: true })
      .select(PRODUCT_FIELDS)
      .sort({ price: 1 })
      .lean()
      .exec() as unknown as Product[];
  }

  /**
   * Fetches several products by id in one round trip.
   *
   * Ids that are not valid ObjectIds are dropped rather than passed to Mongoose,
   * which would throw a CastError and fail the whole request because one stale
   * cart entry was malformed.
   */
  async findByIds(ids: string[]): Promise<Product[]> {
    await dbConnect();
    const valid = ids.filter(id => Types.ObjectId.isValid(id));
    if (valid.length === 0) return [];

    return ProductModel.find({ _id: { $in: valid } })
      .select(PRODUCT_FIELDS)
      .lean()
      .exec() as unknown as Product[];
  }

  /**
   * The "you might also like" row under a product.
   *
   * Only the fields that row renders, because it is read on every product page
   * view and there is no reason to carry descriptions and city pricing across
   * the wire to draw four cards.
   */
  async findRelated(excludeId: string, limit: number): Promise<Product[]> {
    await dbConnect();
    if (!Types.ObjectId.isValid(excludeId)) return [];

    return ProductModel.find({ _id: { $ne: excludeId }, isActive: true })
      .select(
        'name price originalPrice discount mainImage images stock variants showPreorderBadge showOutOfStockBadge customOutOfStockMessage'
      )
      .sort({ order: 1 })
      .limit(limit)
      .lean()
      .exec() as unknown as Product[];
  }

  /**
   * One page of active products, paginated by the DATABASE.
   *
   * The storefront route used to call findAllActive() and then slice the array
   * in JavaScript, so asking for 20 products still read every product in the
   * collection. skip/limit pushes that work to MongoDB.
   */
  async findActivePage(skip: number, limit: number): Promise<Product[]> {
    await dbConnect();
    return ProductModel.find({ isActive: true })
      .select(PRODUCT_FIELDS)
      .sort({ price: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as unknown as Product[];
  }

  async countActive(): Promise<number> {
    await dbConnect();
    return ProductModel.countDocuments({ isActive: true });
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
export const productQueries = new MongoProductQueries();
