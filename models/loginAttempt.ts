import mongoose, { Schema, Document } from 'mongoose';

/**
 * Failed admin password attempts, per client, so the emergency door can be
 * locked after repeated guesses.
 *
 * Why MongoDB and not a counter in memory: Netlify runs many instances of the
 * site at once and recycles them constantly. A counter held in one instance's
 * memory is invisible to the others, so an attacker spreading guesses across
 * requests would never trip it. The lock has to live somewhere all instances can
 * see, and the database is the only such place here.
 */
export interface ILoginAttempt extends Document {
  /** Client identifier — the forwarded IP address. */
  key: string;
  failedCount: number;
  firstFailedAt: Date;
  lockedUntil?: Date;
  updatedAt: Date;
}

const LoginAttemptSchema = new Schema(
  {
    // `unique` already creates the index; `index: true` beside it declared it twice.
    key: { type: String, required: true, unique: true },
    failedCount: { type: Number, default: 0, min: 0 },
    firstFailedAt: { type: Date, default: Date.now },
    lockedUntil: { type: Date },
  },
  { timestamps: true }
);

// Records expire an hour after their last update, so the collection cannot grow
// without bound and a long-quiet client starts clean.
LoginAttemptSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 });

export default mongoose.models.LoginAttempt ||
  mongoose.model<ILoginAttempt>('LoginAttempt', LoginAttemptSchema);
