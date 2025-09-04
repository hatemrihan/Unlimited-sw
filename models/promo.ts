import mongoose, { Schema, Document } from 'mongoose';

export interface IPromo extends Document {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrder?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PromoSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discountType: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed']
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minimumOrder: {
    type: Number,
    min: 0
  },
  maximumDiscount: {
    type: Number,
    min: 0
  },
  usageLimit: {
    type: Number,
    min: 1
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for fast lookup
PromoSchema.index({ code: 1, isActive: 1 });
PromoSchema.index({ expiresAt: 1 });

export default mongoose.models.Promo || mongoose.model<IPromo>('Promo', PromoSchema);
