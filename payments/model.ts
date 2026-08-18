import mongoose, { Schema } from 'mongoose';

/**
 * Which payment methods the store offers. Exactly one document, ever.
 *
 * THE BUG THIS REPLACES
 *
 * The old schema declared:
 *
 *     PaymentSettingsSchema.index({}, { unique: true });   // "only one document"
 *
 * An index on an EMPTY key constrains nothing, and it was never created — the
 * live collection has only its `_id_` index. So nothing prevented a second
 * settings document, and the admin GET *created* one whenever it found none:
 * two requests arriving together on an empty collection make two documents.
 * After that `findOne({})` returns an arbitrary one, so the admin could switch
 * Cash on Delivery off on a document that checkout never reads.
 *
 * THE REAL GUARANTEE
 *
 * Every document carries `key: 'global'` under a genuine unique index. A second
 * document is rejected by MongoDB itself, not by hoping the code behaves.
 */

export interface IPaymentSettings {
  _id?: string;
  key: string;
  /** Cash on Delivery — the one an admin actually controls. */
  codEnabled: boolean;
  /** InstaPay. Always on today; kept so turning it off stays possible later. */
  instaPayEnabled: boolean;
  /** Who last changed this, for a setting that decides whether money can be taken. */
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** The one and only settings document. */
export const SETTINGS_KEY = 'global';

const PaymentSettingsSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      default: SETTINGS_KEY,
      unique: true,
      // NOT `immutable`. Mongoose silently DISCARDS updates to an immutable
      // path, which meant the document created before this field existed could
      // never be stamped with its key — leaving it keyless, and leaving room for
      // a second document beside it. The unique index is the real guarantee.
    },
    codEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    instaPayEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    updatedBy: {
      type: String,
    },
  },
  { timestamps: true }
);

const PaymentSettings =
  mongoose.models.PaymentSettings || mongoose.model('PaymentSettings', PaymentSettingsSchema);

export default PaymentSettings;
