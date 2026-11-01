import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '../../../lib/mongodb';
import Contact from '../../../models/contact';
import { logger } from '../../../utils/logger';
import { requireAdmin } from '../../../lib/requireAdmin';
import { consumeRateLimit, clientKey } from '../../../lib/throttle';

// Ensure Node runtime
export const runtime = 'nodejs';

/**
 * Sized like the other public forms: stops a script, not a person on a shared
 * mobile-network address.
 */
const CONTACT_RATE_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name and email are required').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(200),
});

/** Regex-special characters, so a search for "a+b" is text, not a pattern. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function POST(request: NextRequest) {
  try {
    const throttle = await consumeRateLimit(`contact:${clientKey(request.headers)}`, CONTACT_RATE_LIMIT);
    if (!throttle.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a few minutes and try again.' },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
      );
    }

    const parsed = contactSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Name and email are required' },
        { status: 400 }
      );
    }

    await dbConnect();
    await Contact.create(parsed.data);

    // The saved document is not echoed back: the form only needs to know it worked.
    return NextResponse.json({
      success: true,
      message: 'Contact request submitted successfully',
    });
  } catch (error) {
    logger.error('Error submitting contact form:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}

/**
 * The admin's contact list. Until 30 Oct 2026 this had no admin check, so
 * anyone could read every name and email (found in the store audit).
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    await dbConnect();

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50') || 50));
    const search = (url.searchParams.get('search') || '').slice(0, 100);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
        { status: { $regex: safe, $options: 'i' } }
      ];
    }

    const totalCount = await Contact.countDocuments(query);

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      contacts
    });

  } catch (error) {
    logger.error('Error fetching contacts natively:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contacts schema' },
      { status: 500 }
    );
  }
}
