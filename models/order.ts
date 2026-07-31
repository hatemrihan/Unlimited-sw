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

// Generate unique order ID
OrderSchema.pre('save', function(next) {
  // Always generate orderId if it doesn't exist
  if (!this.orderId) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderId = `ALK${timestamp}${random}`;
  }
  
  next();
});

// Force model recreation to clear any cached schemas
if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

export default mongoose.model<IOrder>('Order', OrderSchema);
