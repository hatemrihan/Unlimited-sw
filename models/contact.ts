import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
    name: string;
    email: string;
    status: 'new' | 'read' | 'replied';
    createdAt: Date;
    updatedAt: Date;
}

const ContactSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    status: {
        type: String,
        enum: ['new', 'read', 'replied'],
        default: 'new'
    }
}, {
    timestamps: true
});

// Force model recreation to clear any cached schemas
if (mongoose.models.Contact) {
    delete mongoose.models.Contact;
}

export default mongoose.model<IContact>('Contact', ContactSchema);
