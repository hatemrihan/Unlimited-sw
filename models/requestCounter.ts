import mongoose, { Schema, Document } from 'mongoose';

/**
 * A counted, expiring bucket of requests per client, for throttling public
 * endpoints.
 *
 * Deliberately separate from `LoginAttempt`, which counts FAILURES and locks the
 * admin door for 15 minutes once it has seen five. This counts EVERY attempt and
 * simply refuses further ones until its window rolls over — a brake, not a lock.
 *
 * Why MongoDB and not memory: Netlify runs many instances at once and recycles
 * them constantly, so a counter held in one instance's memory is invisible to
 * the others and never trips. The count has to live where all instances can see
 * it, exactly as the login lockout does.
 */
export interface IRequestCounter extends Document {
  /** Namespaced client identifier, e.g. `order:41.44.x.x`. */
  key: string;
  count: number;
  windowStartedAt: Date;
  updatedAt: Date;
}

const RequestCounterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, default: 0, min: 0 },
    windowStartedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Buckets expire an hour after their last write, so the collection cannot grow
// without bound and a long-quiet client starts clean.
RequestCounterSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 });

export default (mongoose.models.RequestCounter as mongoose.Model<IRequestCounter>) ||
  mongoose.model<IRequestCounter>('RequestCounter', RequestCounterSchema);
