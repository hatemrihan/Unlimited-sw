import mongoose, { Schema, Document } from 'mongoose';

/**
 * One order's post-processing, waiting to be done.
 *
 * The confirmation email used to exist only as a promise inside the request
 * that created the order. If Brevo was slow, the customer waited; if the
 * function died first, the email was simply lost, with nothing anywhere
 * recording that it should have been sent. A customer who paid and heard
 * nothing has no way to tell "no email yet" from "no order".
 *
 * Writing this row INSIDE the order transaction is what fixes that. The row
 * and the order commit together or not at all, so there is no window in which
 * an order exists with nothing owed to it, and no window in which mail is owed
 * for an order that rolled back.
 */
export interface IPendingEmail extends Document {
  /** The order this is owed for. Unique — one row per order, forever. */
  orderId: string;
  /**
   * Everything the send needs, captured at order time.
   *
   * Snapshotted rather than re-read on drain: the email describes the order as
   * it was placed, and an admin editing the order an hour later must not
   * silently change what the customer is told they bought.
   */
  payload: {
    order: Record<string, unknown>;
    orderData: Record<string, unknown>;
  };
  status: 'pending' | 'sent' | 'abandoned';
  attempts: number;
  /** Not before this moment. Moved forward on each failure, backing off. */
  nextAttemptAt: Date;
  lastError?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PendingEmailSchema = new Schema<IPendingEmail>(
  {
    // Unique, so the inline attempt and the drain can both try to enqueue
    // without ever producing two emails for one order.
    orderId: { type: String, required: true, unique: true },

    payload: {
      order: { type: Schema.Types.Mixed, required: true },
      orderData: { type: Schema.Types.Mixed, required: true },
    },

    status: {
      type: String,
      enum: ['pending', 'sent', 'abandoned'],
      default: 'pending',
    },

    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: () => new Date() },
    lastError: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

// The drain's only query: the work that is due, oldest first.
PendingEmailSchema.index({ status: 1, nextAttemptAt: 1 });

export default (mongoose.models.PendingEmail as mongoose.Model<IPendingEmail>) ||
  mongoose.model<IPendingEmail>('PendingEmail', PendingEmailSchema);
