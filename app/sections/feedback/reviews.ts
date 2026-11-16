/**
 * The approved reviews the home page shows, read on the server and cached
 * (3 Nov 2026). Until then every visitor's phone asked /api/feedback after
 * the page had opened — a "Loading reviews…" flash and a database read per
 * visit. Moderating a review drops the cache (app/api/admin/feedback).
 */
import { unstable_cache } from 'next/cache';

import { DATA_CACHE_SECONDS } from '@/lib/cache-ttl';
import connectToDatabase from '@/lib/mongodb';
import Feedback from '@/models/feedback';
import { cleanFeedbackMessage, reviewName } from '../feedbackText';

export const FEEDBACK_TAG = 'feedback';
const SHOWN = 12;

export interface PublicReview {
  id: string;
  name: string;
  message: string;
  rating: number;
}

const readReviews = unstable_cache(
  async (): Promise<PublicReview[]> => {
    await connectToDatabase();
    const rows = await Feedback.find({ isApproved: true, isShownPublic: true })
      .sort({ createdAt: -1 })
      .limit(SHOWN * 2)
      .select('message rating name')
      .lean();
    return (rows as unknown as Array<{ _id: unknown; message: string; rating: number; name?: string }>)
      .map((r) => ({
        id: String(r._id),
        name: reviewName(r),
        message: cleanFeedbackMessage(r.message),
        rating: Math.max(0, Math.min(5, Math.round(Number(r.rating) || 0))),
      }))
      // A review with no name has always been left out.
      .filter((r) => r.name !== '')
      .slice(0, SHOWN);
  },
  ['feedback:public'],
  // An hour, like everything else the home page reads (it was 5 minutes):
  // the page lives only as long as its shortest-lived data.
  { tags: [FEEDBACK_TAG], revalidate: DATA_CACHE_SECONDS }
);

/** Never throws: no reviews is a page without the list, not a broken page. */
export async function getPublicReviews(): Promise<PublicReview[]> {
  try {
    return await readReviews();
  } catch (error) {
    console.error('[feedback] could not read reviews:', error instanceof Error ? error.message : error);
    return [];
  }
}
