import mongoose, { Schema, Document } from 'mongoose';
import { FUNNEL_STAGES, RETENTION_DAYS, type EventName, type EventPayload } from './events';

/**
 * One thing a visitor did.
 *
 * The shape deliberately mirrors the `analytics_events` table this will become
 * in Postgres — name, session_id, event_id, payload, created_at — so the move
 * is a rewrite of `queries.ts` and nothing else. See analytics/README.md.
 */
export interface IAnalyticsEvent extends Document {
  name: EventName;
  sessionId: string;
  eventId: string;
  payload: EventPayload;
  createdAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    name: { type: String, enum: FUNNEL_STAGES as unknown as string[], required: true },

    sessionId: { type: String, required: true },

    /**
     * The dedup key.
     *
     * Unique, and that is the entire retry story: the tracker may send a batch
     * twice after a flaky connection, `sendBeacon` may double-fire on tab
     * close, and a pixel may replay — every one of those lands on the same
     * `eventId` and is refused by the index rather than inflating the funnel.
     * `insertMany(..., { ordered: false })` is what lets the rest of a batch
     * through while these bounce.
     */
    eventId: { type: String, required: true, unique: true },

    payload: { type: Schema.Types.Mixed, default: {} },

    /**
     * The SERVER's clock, always.
     *
     * A browser clock can be wrong by hours, deliberately or otherwise, and one
     * visitor with a misconfigured laptop would otherwise smear across the
     * daily chart. The tracker sends its own `ts` for ordering within a batch;
     * this is what the report actually buckets on.
     */
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

// Every funnel query filters on name and time.
AnalyticsEventSchema.index({ name: 1, createdAt: -1 });

// The abandonment join walks a session's events.
AnalyticsEventSchema.index({ sessionId: 1, createdAt: -1 });

/**
 * Retention, enforced by the database rather than by remembering.
 *
 * Raw events are worth reading for weeks, not years, and this collection is the
 * fastest-growing thing in the system — one row per page view. Left alone it
 * would outgrow an Atlas shared tier and take the rest of the site down with
 * it. MongoDB deletes these on its own; nothing has to run.
 */
AnalyticsEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 }
);

export default (mongoose.models.AnalyticsEvent as mongoose.Model<IAnalyticsEvent>) ||
  mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema, 'analytics_events');
