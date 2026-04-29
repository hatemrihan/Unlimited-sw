import mongoose from 'mongoose';

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
    stock: { type: Number, default: 0 },         // Stock for this variant
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
}, {
  // Add timestamps for tracking 
  timestamps: true,
});

// Create OPTIMIZED indexes for ultra-fast querying
ProductSchema.index({ name: 'text', description: 'text' }); // For scalable search
ProductSchema.index({ isActive: 1, order: 1 }); // For regular products


// Export the model
export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
