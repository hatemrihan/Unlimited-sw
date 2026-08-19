import mongoose from 'mongoose';
import { CATEGORY_KEYS, type CategoryKey } from './categories';

// Interface for Product (what admin can add/edit)
export interface Product {
  _id?: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  mainImage: string;
  images: string[];
  videos?: string[];  // Product videos URLs (optional array)
  description: string;
  promoCode: string;
  variants: Array<{
    name: string;      // Variant name like "Small Kit", "Large Set", "Premium Bundle"
    stock: number;     // Stock for this variant
    price?: number;    // Optional different price for variant
    images?: string[]; // Optional variant-specific images
    videos?: string[]; // Optional variant-specific videos
  }>;
  stock: number;
  isActive: boolean;
  order: number;

  // Admin-controlled badges (only considered when stock === 0)
  showOutOfStockBadge?: boolean;
  showPreorderBadge?: boolean;
  customOutOfStockMessage?: string;

  // Detailed product information (optional fields for admin control)
  detailedDescription?: string;  // Long detailed description
  specifications?: string;       // Technical specs/details
  shippingInfo?: string;         // Shipping information
  faqs?: Array<{                // Frequently asked questions
    question: string;
    answer: string;
  }>;

  // Per-governorate shipping/COD overrides (product price comes from Product.price)
  cityPricing?: Array<{
    governorate: string;
    shippingCost?: number;
    codFee?: number;
    isActive: boolean;
  }>;

  // ─── Phase 2: bilingual content, slugs, category ───────────────────────────
  slug?: string;                    // English URL segment
  slugAr?: string;                  // Arabic URL segment (real Arabic words)
  nameAr?: string;
  descriptionAr?: string;
  detailedDescriptionAr?: string;
  specificationsAr?: string;
  faqsAr?: Array<{
    question: string;
    answer: string;
  }>;
  category?: CategoryKey;
  seoTitle?: string;
  seoTitleAr?: string;
  seoDescription?: string;
  seoDescriptionAr?: string;

  /**
   * Phase 4 — explicit prices per currency, set by hand.
   *
   * Never computed from an FX rate at render time: a price that moves with the
   * rate differs between the page, the cart, and Merchant Center's crawl, and
   * that mismatch is what gets a Shopping account suspended. `price` stays the
   * EGP base.
   */
  prices?: {
    SAR?: number;
    AED?: number;
    KWD?: number;
  };

  createdAt?: Date;
  updatedAt?: Date;
}

// Database schema for products
const ProductSchema = new mongoose.Schema({
  // Product name that admin can edit
  name: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Product price
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // Original price (for sale pricing)
  originalPrice: {
    type: Number,
    min: 0,
  },

  // Discount percentage (optional)
  discount: {
    type: Number,
    min: 0,
    max: 100,
    required: false,
  },
  
  // Main product image
  mainImage: {
    type: String,
    required: true,
  },
  
  // Additional product images
  images: [{
    type: String,
  }],
  
  // Product videos (optional array)
  videos: [{
    type: String,
  }],
  
  // Product description
  description: {
    type: String,
    required: true,
  },
  
  // Promo code for product (optional)
  promoCode: {
    type: String,
    required: false,
    default: '',
  },
  
  // Product variants (custom equipment options)
  variants: [{
    name: { type: String, required: true },      // Variant name (e.g., "Black", "Gray")
    // min: 0 mirrors the top-level stock field — defence in depth behind the
    // $elemMatch guard in the inventory module.
    stock: { type: Number, default: 0, min: 0 }, // Stock for this variant
    price: { type: Number },                     // Optional variant price
    images: [{ type: String }],                  // Variant-specific images
    videos: [{ type: String }]                   // Variant-specific videos
  }],
  
  // Stock quantity
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Whether product is active/visible
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Order for displaying products
  order: {
    type: Number,
    default: 0,
  },

  // Admin-controlled badges (only considered when stock === 0)
  showOutOfStockBadge: {
    type: Boolean,
    default: false,
  },
  showPreorderBadge: {
    type: Boolean,
    default: false,
  },
  customOutOfStockMessage: {
    type: String,
    default: '',
  },

  // Detailed product information (optional fields for admin control)
  detailedDescription: {
    type: String,
    default: '',
  },

  specifications: {
    type: String,
    default: '',
  },

  shippingInfo: {
    type: String,
    default: '',
  },

  faqs: [{
    question: { type: String, required: false },
    answer: { type: String, required: false },
  }],

  // Per-governorate shipping/COD overrides
  cityPricing: [{
    governorate: { type: String, required: true },
    shippingCost: { type: Number, default: 0, min: 0 },
    codFee: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  }],

  // ─── Phase 2: bilingual content, slugs, category ───────────────────────────

  // URL segments. Not `required`, because the five products that predate this
  // field must keep loading until scripts/backfill-slugs.js has run.
  slug: {
    type: String,
    trim: true,
  },
  slugAr: {
    type: String,
    trim: true,
  },

  // Arabic copy. Empty string, never null — the pages fall back to English when
  // a field is blank, and `''` makes that one check instead of two.
  nameAr:                { type: String, default: '' },
  descriptionAr:         { type: String, default: '' },
  detailedDescriptionAr: { type: String, default: '' },
  specificationsAr:      { type: String, default: '' },

  faqsAr: [{
    question: { type: String, required: false },
    answer:   { type: String, required: false },
  }],

  category: {
    type: String,
    enum: CATEGORY_KEYS,
  },

  // Manual search-result overrides; blank means "use the generated text".
  seoTitle:         { type: String, default: '' },
  seoTitleAr:       { type: String, default: '' },
  seoDescription:   { type: String, default: '' },
  seoDescriptionAr: { type: String, default: '' },

  // Phase 4. Absent until a Gulf country is opened; a product with no price in
  // a country's currency is hidden there rather than shown at the EGP number.
  prices: {
    SAR: { type: Number, min: 0 },
    AED: { type: Number, min: 0 },
    KWD: { type: Number, min: 0 },
  },
}, {
  // Add timestamps for tracking 
  timestamps: true,
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// An index is a shortcut MongoDB keeps so it can find and order documents
// without reading the whole collection. A query can only use one if the index
// matches BOTH what it filters on and what it sorts by.

ProductSchema.index({ name: 'text', description: 'text' }); // admin search

// Admin listing and any hand-arranged ordering.
ProductSchema.index({ isActive: 1, order: 1 });

/**
 * The storefront read: filter { isActive: true }, sort { price: 1 }.
 *
 * Without this, MongoDB could use the { isActive, order } index for the filter
 * but then had to sort every matching product by price IN MEMORY, on every
 * single request — and an in-memory sort is capped at 32MB, so it degrades as
 * the catalogue grows and eventually fails outright.
 *
 * Keeping the sort on price (cheapest first) is a deliberate product decision;
 * this index is what makes that ordering free.
 */
ProductSchema.index({ isActive: 1, price: 1 });

/**
 * Slug lookups — the product page's only query once Phase 2 routes go live.
 *
 * `unique` because two products sharing a slug means one of them is
 * unreachable, and which one you get would depend on collection order.
 *
 * `sparse` because every product currently in the collection has no slug at
 * all. A plain unique index reads them all as sharing the value `null` and
 * refuses to build — the same trap as `clientOrderId` on orders.
 */
ProductSchema.index({ slug: 1 }, { unique: true, sparse: true });
ProductSchema.index({ slugAr: 1 }, { unique: true, sparse: true });

/** Category pages: filter by category, cheapest first — same shape as the shop read. */
ProductSchema.index({ category: 1, isActive: 1, price: 1 });


// Export the model
export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
