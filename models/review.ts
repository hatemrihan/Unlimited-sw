import mongoose, { Schema } from 'mongoose';

/**
 * A customer review of one product.
 *
 * SUPABASE-PORTABLE, same rules as models/article.ts: flat scalars only,
 * `productId` stored as a plain string rather than an ObjectId ref.
 *
 * `approved` defaults to FALSE and that is the whole design. Reviews are
 * publicly writable — anything that renders unmoderated user text on a product
 * page is a spam target, and worse, it would feed unmoderated text straight
 * into the aggregateRating that Google shows as stars.
 */
export interface Review {
  _id?: string;
  productId: string;
  name: string;
  rating: number;
  text: string;
  photos: string[];
  approved: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReviewSchema = new Schema({
  productId: { type: String, required: true },
  name:      { type: String, required: true, trim: true, maxlength: 80 },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  text:      { type: String, required: true, trim: true, maxlength: 2000 },
  photos:    [{ type: String }],

  // Never default this to true.
  approved:  { type: Boolean, default: false },
}, { timestamps: true });

// The product page read: approved reviews for one product, newest first.
ReviewSchema.index({ productId: 1, approved: 1, createdAt: -1 });

// The moderation queue: what is waiting, oldest first.
ReviewSchema.index({ approved: 1, createdAt: 1 });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
