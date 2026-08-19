import dbConnect from '@/lib/mongodb';
import ReviewModel, { type Review } from '@/models/review';

/**
 * The only file that talks to the reviews collection — same rule as
 * articleRepository, and enforced by the same test.
 */

export interface ReviewDto {
  productId: string;
  name: string;
  rating: number;
  text: string;
  photos?: string[];
}

export interface RatingSummary {
  ratingValue: number;
  reviewCount: number;
}

function toReview(doc: any): Review | null {
  return doc ? (JSON.parse(JSON.stringify(doc)) as Review) : null;
}

/** Approved reviews for one product, newest first. */
export async function listApproved(productId: string): Promise<Review[]> {
  await dbConnect();
  const docs = await ReviewModel.find({ productId, approved: true })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map(toReview).filter(Boolean) as Review[];
}

/**
 * The average rating and count for one product, from approved reviews only.
 *
 * This feeds the `aggregateRating` in the product's structured data. Counting
 * unapproved reviews here would let anyone move the star rating Google displays
 * without a human ever seeing the text.
 */
export async function ratingSummary(productId: string): Promise<RatingSummary> {
  const reviews = await listApproved(productId);
  if (reviews.length === 0) return { ratingValue: 0, reviewCount: 0 };

  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return {
    ratingValue: Math.round((total / reviews.length) * 10) / 10,
    reviewCount: reviews.length,
  };
}

/** Everything awaiting moderation, oldest first. */
export async function listPending(): Promise<Review[]> {
  await dbConnect();
  const docs = await ReviewModel.find({ approved: false }).sort({ createdAt: 1 }).lean();
  return docs.map(toReview).filter(Boolean) as Review[];
}

/** Records a review. Always unapproved — see models/review.ts. */
export async function create(dto: ReviewDto): Promise<Review> {
  await dbConnect();
  const doc = await ReviewModel.create({ ...dto, approved: false });
  return toReview(doc.toObject())!;
}

export async function setApproved(id: string, approved: boolean): Promise<Review | null> {
  await dbConnect();
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
  return toReview(
    await ReviewModel.findByIdAndUpdate(id, { $set: { approved } }, { new: true }).lean()
  );
}

export async function remove(id: string): Promise<boolean> {
  await dbConnect();
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return false;
  const result = await ReviewModel.deleteOne({ _id: id });
  return result.deletedCount === 1;
}

/**
 * How many reviews one client has posted since `since`.
 *
 * The rate limit. Without it, one script can fill the moderation queue faster
 * than anyone can empty it.
 */
export async function countRecentByName(name: string, since: Date): Promise<number> {
  await dbConnect();
  return ReviewModel.countDocuments({ name, createdAt: { $gte: since } });
}

export const reviewRepository = {
  listApproved,
  ratingSummary,
  listPending,
  create,
  setApproved,
  remove,
  countRecentByName,
};

export type { Review };
