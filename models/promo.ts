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
  /** Campaign start. Absent means the code is live as soon as it is created. */
  startsAt?: Date;
  expiresAt?: Date;
  description?: string;
  waiveShipping?: boolean;
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
  /**
   * When the campaign begins. The admin form has always had a "valid from"
   * picker, but the value was thrown away by the API and no field existed to
   * hold it — so every scheduled campaign went live the moment it was saved.
   *
   * Absent (every code created before this field existed) means "live now", so
   * existing codes keep behaving exactly as they do today.
   */
  startsAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  description: {
    type: String,
    trim: true
  },
  waiveShipping: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for fast lookup
PromoSchema.index({ code: 1, isActive: 1 });
PromoSchema.index({ expiresAt: 1 });

export default mongoose.models.Promo || mongoose.model<IPromo>('Promo', PromoSchema);
