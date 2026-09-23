import mongoose from 'mongoose';

/**
 * Global Free-Shipping Override
 *
 * A singleton document (keyed by `key: 'global'`) that lets the admin
 * make ALL shipping and COD fees zero for every governorate until a
 * chosen UTC timestamp.
 *
 * Both the checkout cities API and the server-side order pricing service
 * read this document (via lib/freeShippingCheck.ts) so the two sides
 * always agree and the 409 mismatch guard never fires.
 *
 * The collection is created automatically by Mongoose — no migration needed.
 * Rollback is simply deleting the document.
 */

export interface IFreeShippingOverride {
  key: string;
  enabled: boolean;
  expiresAt: Date;
  enabledBy: string;
  enabledAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const FreeShippingOverrideSchema = new mongoose.Schema({
  /** Fixed value 'global' — unique index guarantees only one document. */
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global',
  },

  /** Whether the override is currently switched on. */
  enabled: {
    type: Boolean,
    required: true,
    default: false,
  },

  /** UTC timestamp when the free-shipping period ends. */
  expiresAt: {
    type: Date,
    required: true,
  },

  /** Email or name of the admin who toggled it on — audit trail. */
  enabledBy: {
    type: String,
    default: '',
  },

  /** When the toggle was last switched on. */
  enabledAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const FreeShippingOverride =
  mongoose.models.FreeShippingOverride ||
  mongoose.model<IFreeShippingOverride>('FreeShippingOverride', FreeShippingOverrideSchema);

export default FreeShippingOverride;
