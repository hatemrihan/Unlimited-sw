import { NextRequest, NextResponse } from 'next/server';
import { ingestEventsSchema } from '../../../../analytics/schema';
import { insertEvents } from '../../../../analytics/queries';
import { consumeRateLimit, clientKey } from '../../../../lib/throttle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generous, because a normal session sends fewer than ten requests in total —
 * the tracker batches, and most visitors flush once or twice. Sixty per ten
 * minutes leaves an enormous margin for a busy shopper on a shared carrier
 * address while still stopping a script from filling the collection.
 *
 * Same limiter the order and upload endpoints use; this is its third consumer.
 */
const ANALYTICS_RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };

/**
 * Where the browser's funnel events arrive.
 *
 * Public by necessity: the visitors this measures have no account and never
 * will — that is the entire population being counted. So the protections are
 * the ones that work without knowing who is calling: a zod allowlist that makes
 * personal data unstorable, a rate limit per address, and a unique `eventId`
 * so a replayed batch cannot inflate anything.
 *
 * Answers 202, not 200. The events are accepted, not acted upon, and the
 * browser has nothing to do with the result — it has already moved on. Nothing
 * here reads, joins or aggregates; the dashboard does that on its own time.
 */
export async function POST(request: NextRequest) {
  const throttle = await consumeRateLimit(
    `analytics:${clientKey(request.headers)}`,
    ANALYTICS_RATE_LIMIT
  );

  if (!throttle.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many events' },
      {
        status: 429,
        headers: { 'Retry-After': String(throttle.retryAfterSeconds), 'Cache-Control': 'no-store' },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const parsed = ingestEventsSchema.safeParse(body);

  if (!parsed.success) {
    // Deliberately terse. This is answering an automated client, and a detailed
    // validation report here is a map of the schema for anyone probing it.
    return NextResponse.json(
      { success: false, error: 'Invalid events' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const result = await insertEvents(parsed.data.events);

    return NextResponse.json(
      { success: true, ...result },
      { status: 202, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    // Analytics failing is not the visitor's problem and must never look like
    // the site failing. Logged here, invisible there.
    console.error('[api/analytics/events] write failed:', error);
    return NextResponse.json(
      { success: false, error: 'Could not record events' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
