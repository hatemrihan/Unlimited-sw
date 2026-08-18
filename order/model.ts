import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderProduct {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  /** Canonical variant identity — the value stock was decremented against. */
  variantName?: string;
  size?: string;
  color?: string;
  image: string;
}

export interface IOrder extends Document {
  orderId?: string;
  /**
   * The browser's id for one checkout attempt, not for one order.
   *
   * Sent by the customer's page and never generated here — that is the whole
   * point. A retry of the same attempt carries the same value, so the unique
   * index below refuses it; a genuine second purchase mints a new one and goes
   * through. Optional, because a page cached before this shipped sends none.
   */
  clientOrderId?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  products: IOrderProduct[];
  paymentMethod: 'cashOnDelivery' | 'instaPay';
  transactionScreenshot?: string;
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  codFee?: number;
  promoCode?:string;
  discountAmount?: number;  
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  /** Idempotency guard: true once this order's stock has been returned to inventory. */
  stockRestored?: boolean;
  notes?: string;
  orderDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderProductSchema = new Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  // Persisted so a cancelled order can be restocked and sales can be audited
  // per-variant. `size` is the legacy flattened form and is kept for display.
  variantName: { type: String },
  size: { type: String },
  color: { type: String },
  image: { type: String, required: true }
});

const OrderSchema = new Schema({
  orderId: { type: String, unique: true },

  // `sparse` matters as much as `unique` here. Every order already in the
  // collection has no such field, and a plain unique index treats all of them
  // as sharing the value `null` — so building it would fail, and if it somehow
  // did not, the second order without an id would be refused. Sparse indexes
  // only the documents that actually carry one.
  clientOrderId: { type: String, unique: true, sparse: true },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true }
  },
  products: [OrderProductSchema],
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cashOnDelivery', 'instaPay']
  },
  transactionScreenshot: { type: String },
  totalAmount: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, required: true },
  codFee: { type: Number, default: 0 },
  promoCode: {type: String},
  discountAmount: {type: Number, default: 0},  
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  // Idempotency guard for stock restoration — never restock the same order twice.
  stockRestored: { type: Boolean, default: false },
  notes: { type: String },
  orderDate: { type: Date, default: Date.now }
}, {
  timestamps: true
});

/**
 * Indexes.
 *
 * The collection had none of these. `GET /api/orders` runs
 * `find({}).sort({ createdAt: -1 })` on every single dashboard load, so with no
 * index behind that sort MongoDB was sorting the ENTIRE orders collection in
 * memory, every time — and an in-memory sort is capped at 32 MB. It works fine
 * at 200 orders, crawls at 5,000, and eventually the dashboard just stops
 * loading with "Sort exceeded memory limit". Exactly the bug already fixed for
 * products with `{ isActive: 1, price: 1 }`; orders was missed.
 *
 * One index per query the admin list can actually issue:
 */

// The default list: newest first, no filter.
OrderSchema.index({ createdAt: -1 });

// Filtered by status, still newest first. Compound so one index serves both.
OrderSchema.index({ status: 1, createdAt: -1 });

// The other two sort options the table offers.
OrderSchema.index({ orderDate: -1 });
OrderSchema.index({ totalAmount: -1 });

// Admin search. Phone and email are matched with an anchored `^` regex
// precisely so they can use these; an unanchored regex cannot.
OrderSchema.index({ 'customer.phone': 1 });
OrderSchema.index({ 'customer.email': 1 });

// Note: searching by customer NAME is an unanchored regex and therefore a
// collection scan by design — partial-name search is the common case and an
// ordinary index cannot serve it. It stays bounded by the page limit. If the
// order book grows large enough for that to hurt, the answer is a text index on
// `customer.name`, not another btree.

/**
 * `ALK` + the last 6 digits of the epoch + 10 random hex characters.
 *
 * The old version took its random half from
 * `Math.random().toString(36).substring(2, 8)`, which yields AT MOST six base-36
 * characters and sometimes fewer — `Math.random()` can produce a short decimal,
 * and the slice then silently returns less entropy than it looks like it does.
 * `orderId` is a unique index, so a collision did not corrupt anything; it threw
 * E11000 and the customer was told "please try again" AFTER their stock had been
 * reserved and rolled back. A lost sale caused by nothing but bad luck.
 *
 * Web Crypto rather than `node:crypto`: this module is imported from route
 * handlers, and the repo has already been bitten once by a `node:crypto` import
 * that compiled cleanly and then failed at runtime on the Edge runtime.
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString().slice(-6);

  const bytes = new Uint8Array(5);
  globalThis.crypto.getRandomValues(bytes);
  const random = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();

  return `ALK${timestamp}${random}`;
}

// Generate unique order ID
OrderSchema.pre('save', function(next) {
  // Always generate orderId if it doesn't exist
  if (!this.orderId) {
    this.orderId = generateOrderId();
  }

  next();
});

// There is deliberately NO retry hook here. Re-entering save() from Mongoose's
// own post-save error hook raises ParallelSaveError — the document is still
// mid-write — so a "retry the id" hook fails in exactly the situation it exists
// to handle. The entropy above is the fix; the unique index remains the backstop.

// Standard Mongoose model cache, matching product/model.ts. Deleting and
// re-registering on every module load rebuilds the schema constantly in a hot
// serverless environment and defeats the cache entirely.
export default (mongoose.models.Order as mongoose.Model<IOrder>) ||
  mongoose.model<IOrder>('Order', OrderSchema);
