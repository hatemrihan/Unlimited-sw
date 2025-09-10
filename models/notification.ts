import mongoose, { Document, Schema } from 'mongoose';

// Interface for Notification
export interface INotification extends Document {
  _id: string;
  type: 'order' | 'stock' | 'system';
  title: string;
  message: string;
  data?: any; // Additional data like order details, stock levels, etc.
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Database schema for notifications
const NotificationSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['order', 'stock', 'system']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create index for efficient querying
NotificationSchema.index({ isRead: 1, createdAt: -1 });

// Export the model
export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
