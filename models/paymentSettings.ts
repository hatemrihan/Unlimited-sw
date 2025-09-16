import mongoose from 'mongoose';

// Interface for Payment Settings
export interface IPaymentSettings {
  _id?: string;
  codEnabled: boolean; // Cash on Delivery toggle
  instaPayEnabled: boolean; // InstaPay (always true, but keeping for future flexibility)
  createdAt?: Date;
  updatedAt?: Date;
}

// Database schema for payment settings
const PaymentSettingsSchema = new mongoose.Schema({
  // Cash on Delivery toggle (admin controlled)
  codEnabled: {
    type: Boolean,
    required: true,
    default: true, // Default: COD is enabled
  },
  
  // InstaPay toggle (always enabled, but keeping for future)
  instaPayEnabled: {
    type: Boolean,
    required: true,
    default: true, // Always enabled as requested
  },
}, {
  timestamps: true,
});

// Ensure only one settings document exists
PaymentSettingsSchema.index({}, { unique: true });

// Create the model
const PaymentSettings = mongoose.models.PaymentSettings || mongoose.model('PaymentSettings', PaymentSettingsSchema);

export default PaymentSettings;



