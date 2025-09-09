import mongoose from 'mongoose';

// Interface for City Pricing Configuration
export interface ICityPricing {
  _id?: string;
  cityName: string;
  governorate: string;
  shippingCost: number;
  codFee: number; // Cash on Delivery fee
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Database schema for city pricing
const CityPricingSchema = new mongoose.Schema({
  // City name
  cityName: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  
  // Governorate name
  governorate: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Shipping cost for this city
  shippingCost: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  
  // Cash on Delivery fee for this city
  codFee: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  
  // Whether this city is active for delivery
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Create index for efficient querying
CityPricingSchema.index({ cityName: 1, governorate: 1 });
CityPricingSchema.index({ isActive: 1 });

// Create the model
const CityPricing = mongoose.models.CityPricing || mongoose.model('CityPricing', CityPricingSchema);

export default CityPricing;


