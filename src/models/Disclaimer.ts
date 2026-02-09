import mongoose, { Schema, Document } from 'mongoose';

export interface IDisclaimer extends Document {
  slug: string;
  category: 'verification' | 'payment' | 'liability' | 'data' | 'general';
  title: Record<string, string>; // { fr: '...', en: '...' }
  content: Record<string, string>;
  isActive: boolean;
  version: number;
  lastUpdatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DisclaimerSchema: Schema = new Schema({
  slug: { type: String, required: true, unique: true },
  category: {
    type: String,
    enum: ['verification', 'payment', 'liability', 'data', 'general'],
    required: true,
    index: true,
  },
  title: { type: Map, of: String, required: true },
  content: { type: Map, of: String, required: true },
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<IDisclaimer>('Disclaimer', DisclaimerSchema);
