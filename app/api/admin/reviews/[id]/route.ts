import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/requireAdmin';
import { reviewRepository } from '@/repositories/reviewRepository';
import { revalidateProducts } from '@/product';

interface Params {
  params: Promise<{ id: string }>;
}

const approveSchema = z.object({ approved: z.boolean() });

/**
 * Approve or unapprove a review.
 *
 * Approving changes the product's aggregateRating, which is baked into the
 * cached product page — so the product cache is purged here. Without that, the
 * stars in search results would lag behind moderation by the cache TTL.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  const review = await reviewRepository.setApproved(id, parsed.data.approved);
  if (!review) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  try {
    revalidateProducts();
  } catch (e) {
    // The review is saved either way; a stale rating for one TTL is not worth
    // failing the request over.
    console.error('[admin/reviews] cache purge failed:', e);
  }

  return NextResponse.json({ success: true, review });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const removed = await reviewRepository.remove(id);

  if (!removed) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  try {
    revalidateProducts();
  } catch (e) {
    console.error('[admin/reviews] cache purge failed:', e);
  }

  return NextResponse.json({ success: true });
}
