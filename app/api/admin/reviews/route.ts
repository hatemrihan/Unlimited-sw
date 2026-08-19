import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/requireAdmin';
import { reviewRepository } from '@/repositories/reviewRepository';

/** The moderation queue: everything waiting for a human. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json({ success: true, reviews: await reviewRepository.listPending() });
  } catch (error) {
    console.error('[admin/reviews] list failed:', error);
    return NextResponse.json({ success: false, error: 'Could not load reviews' }, { status: 500 });
  }
}
