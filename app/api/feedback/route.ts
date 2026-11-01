
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Feedback from '../../../models/feedback';
import connectToDatabase from '../../../lib/mongodb';
import { consumeRateLimit, clientKey } from '../../../lib/throttle';

/**
 * The same shared limiter as orders, uploads and contacts. Before 30 Oct 2026
 * this form had none, so a script could fill the moderation queue.
 */
const FEEDBACK_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

const feedbackSchema = z.object({
  message: z.string().trim().min(1, 'Please write your feedback').max(500, 'Feedback must be 500 characters or fewer'),
  rating: z.coerce.number().int().min(1, 'Please choose a star rating').max(5, 'Please choose a star rating'),
  name: z.string().trim().max(80).optional().default(''),
  email: z.string().trim().max(200).optional().default(''),
  phone: z.string().trim().max(30).optional().default(''),
});

// POST - Submit new feedback
export async function POST(request: NextRequest) {
  try {
    const throttle = await consumeRateLimit(`feedback:${clientKey(request.headers)}`, FEEDBACK_RATE_LIMIT);
    if (!throttle.allowed) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait a few minutes and try again.' },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
      );
    }

    const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Message and rating are required' },
        { status: 400 }
      );
    }
    const { message, rating, name, email, phone } = parsed.data;

    await connectToDatabase();

    // Create new feedback with separate fields
    const feedback = new Feedback({
      message,
      rating,
      name,
      email,
      phone,
      isApproved: false,
      isShownPublic: false
    });

    await feedback.save();

    return NextResponse.json(
      { message: 'Feedback submitted successfully! It will be reviewed by our team.' },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

// GET - Retrieve approved AND publicly visible feedback
export async function GET() {
  try {
    await connectToDatabase();

    const feedback = await Feedback.find({
      isApproved: true,
      isShownPublic: true
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .select('message rating createdAt name');

    return NextResponse.json({ feedback });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

