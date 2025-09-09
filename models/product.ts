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
  video?: string;  // Product video URL (optional)
  description: string;
  promoCode: string;
  variants: Array<{
    name: string;      // Variant name like "Small Kit", "Large Set", "Premium Bundle"
    stock: number;     // Stock for this variant
    price?: number;    // Optional different price for variant
  }>;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  order: number;

  // NEW: Detailed product information (optional fields for admin control)
  detailedDescription?: string;  // Long detailed description
  specifications?: string;       // Technical specs/details
  shippingInfo?: string;         // Shipping information
  faqs?: Array<{                // Frequently asked questions
    question: string;
    answer: string;
  }>;

  // City-specific pricing
  cityPricing?: Array<{
    cityName: string;
    governorate: string;
    price: number;
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
  
  // Product video (optional)
  video: {
    type: String,
    required: false,
    default: '',
  },
  
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
    name: { type: String, required: true },      // Variant name
    stock: { type: Number, default: 0 },         // Stock for this variant
    price: { type: Number }                      // Optional variant price
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
  
  // Whether product is featured
  isFeatured: {
    type: Boolean,
    default: false,
  },
  
  // Order for displaying products
  order: {
    type: Number,
    default: 0,
  },

  // NEW: Detailed product information (optional fields for admin control)
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
    question: { type: String, required: true },
    answer: { type: String, required: true },
  }],

  // City-specific pricing
  cityPricing: [{
    cityName: { type: String, required: true },
    governorate: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  }],
}, {
  // Add timestamps for tracking
  timestamps: true,
});

// Create index for efficient querying
ProductSchema.index({ order: 1, isActive: 1, isFeatured: 1 });

// Export the model
export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
