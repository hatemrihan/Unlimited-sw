import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
  _id: string;
  message: string;
  rating: number;
  createdAt: Date;
  isApproved: boolean;
  isShownPublic: boolean;
  name?: string;
  email?: string;
  phone?: string;
}

const FeedbackSchema: Schema = new Schema({
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isShownPublic: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  }
});

// Create indexes for better performance
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ isApproved: 1, createdAt: -1 });

export default mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);


