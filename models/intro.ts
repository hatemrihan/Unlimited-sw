import mongoose from 'mongoose';

// Interface for Intro Item (what admin can add/edit)
export interface IntroItem {
  _id?: string;
  title: string;
  mainImage: string;
  leftImage: string;
  rightImage: string;
  description: string;
  url: string;
  isVideo: boolean;
  isActive: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Database schema for intro items
const IntroItemSchema = new mongoose.Schema({
  // Title that admin can edit
  title: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Main image/video URL that admin can upload
  mainImage: {
    type: String,
    required: true,
  },
  
  // Left side image that admin can upload
  leftImage: {
    type: String,
    required: true,
  },
  
  // Right side image that admin can upload
  rightImage: {
    type: String,
    required: true,
  },
  
  // Description text that admin can edit
  description: {
    type: String,
    required: true,
  },
  
  // URL that admin can set for redirection
  url: {
    type: String,
    required: true,
  },
  
  // Whether main image is video or image
  isVideo: {
    type: Boolean,
    default: false,
  },
  
  // Whether this item is active/visible
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Order for displaying items
  order: {
    type: Number,
    default: 0,
  },
}, {
  // Add timestamps for tracking
  timestamps: true,
});

// Create index for efficient querying
IntroItemSchema.index({ order: 1, isActive: 1 });

// Export the model
export default mongoose.models.IntroItem || mongoose.model('IntroItem', IntroItemSchema);
