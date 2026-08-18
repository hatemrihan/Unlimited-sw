import { z } from 'zod';
import { FUNNEL_STAGES, MAX_EVENTS_PER_REQUEST } from './events';

/**
 * What the browser is allowed to send.
 *
 * This endpoint is public — it has to be, since the visitors it measures have
 * no account and never will. So the schema is the only thing standing between
 * the collection and whatever anyone chooses to POST at it, and it is written
 * as an allowlist for that reason: unknown keys are STRIPPED, not stored.
 *
 * The practical consequence, and the point of the exercise: there is no field
 * here for an email, a phone number, a name or an address. Not "we don't fill
 * those in" — they cannot be stored. That is what makes this collection
 * uninteresting to leak and uncomplicated to answer for.
 */

/** A string that is bounded and stripped, because free text from strangers always is. */
const shortText = z.string().trim().min(1).max(200);

/**
 * Money and counts.
 *
 * Finite and non-negative: `Infinity` and `NaN` survive `JSON.parse` and would
 * poison a `$sum` for the whole period, and a negative "value" is either a bug
 * or somebody testing whether we check.
 */
const nonNegativeNumber = z
  .number()
  .finite()
  .min(0)
  .max(10_000_000);

const payloadSchema = z
  .object({
    path: shortText.optional(),
    productId: shortText.optional(),
    productName: shortText.optional(),
    variantName: shortText.optional(),
    quantity: nonNegativeNumber.optional(),
    value: nonNegativeNumber.optional(),
    currency: z.literal('EGP').optional(),
    orderId: shortText.optional(),
    itemCount: nonNegativeNumber.optional(),
    source: z.enum(['client', 'server']).optional(),
  })
  // Zod objects strip unknown keys by default; saying so explicitly here is the
  // difference between "happens to drop PII" and "is designed to".
  .strip();

export const analyticsEventSchema = z.object({
  name: z.enum(FUNNEL_STAGES),

  /**
   * UUIDs, both of them.
   *
   * `eventId` is what the unique index dedups on, so it must be something the
   * browser cannot collide by accident — a retry, a `sendBeacon` that fires
   * twice on a flaky tab close, or a pixel replay must all land on the same row
   * rather than counting twice.
   */
  sessionId: z.string().trim().uuid(),
  eventId: z.string().trim().uuid(),

  payload: payloadSchema.optional().default({}),
});

export const ingestEventsSchema = z.object({
  events: z
    .array(analyticsEventSchema)
    .min(1, 'Send at least one event')
    // A cap, because "batch your events" and "send us your whole day in one
    // request" are different things and only one of them is a design.
    .max(MAX_EVENTS_PER_REQUEST, `At most ${MAX_EVENTS_PER_REQUEST} events per request`),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
export type IngestEventsInput = z.infer<typeof ingestEventsSchema>;
