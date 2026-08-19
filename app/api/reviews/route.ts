import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { reviewRepository } from '@/repositories/reviewRepository';
import { clientKey } from '@/login/rateLimit';

/**
 * Public reviews endpoint.
 *
 * GET  — approved reviews for one product.
 * POST — submits a review. It is stored unapproved and is invisible until an
 *        admin approves it, so this endpoint cannot publish anything by itself.
 *
 * The rate limit is deliberately crude: this is a shop that takes a handful of
 * reviews a week, and the cost of a false positive (somebody has to wait a
 * minute) is far lower than the cost of an open write endpoint.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;

/** In-process, per-instance. Enough friction for a script, no Redis needed. */
const recentByClient = new Map<string, number[]>();

const reviewSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product'),
  name: z.string().trim().min(2, 'Name is too short').max(80),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(10, 'Please write a little more').max(2000),
  // Only images we host. An arbitrary URL here is an open image-embed on our
  // own product pages.
  photos: z.array(z.string().url()).max(4).optional().default([]),
});

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recentByClient.get(key) ?? []).filter(at => now - at < WINDOW_MS);

  if (hits.length >= MAX_PER_WINDOW) {
    recentByClient.set(key, hits);
    return true;
  }

  hits.push(now);
  recentByClient.set(key, hits);
  return false;
}

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('productId');

  if (!productId || !/^[0-9a-fA-F]{24}$/.test(productId)) {
    return NextResponse.json({ success: false, error: 'Invalid product' }, { status: 400 });
  }

  try {
    const [reviews, summary] = await Promise.all([
      reviewRepository.listApproved(productId),
      reviewRepository.ratingSummary(productId),
    ]);

    return NextResponse.json({ success: true, reviews, summary });
  } catch (error) {
    console.error('[reviews] GET failed:', error);
    return NextResponse.json({ success: false, error: 'Could not load reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const key = clientKey(request.headers);

  if (isRateLimited(key)) {
    return NextResponse.json(
      { success: false, error: 'Too many reviews from here. Please try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid review' },
      { status: 400 }
    );
  }

  try {
    await reviewRepository.create(parsed.data);

    // The review id is deliberately not returned: nothing a visitor can do with
    // it, and handing out ids invites probing.
    return NextResponse.json({ success: true, pending: true }, { status: 201 });
  } catch (error) {
    console.error('[reviews] POST failed:', error);
    return NextResponse.json({ success: false, error: 'Could not save review' }, { status: 500 });
  }
}
