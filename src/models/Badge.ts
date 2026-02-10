import mongoose, { Schema, Document } from 'mongoose';

export interface IBadge extends Document {
  name: string;
  slug: string;
  description: string;
  icon: string;
  iconBg?: string;
  category: 'verification' | 'performance' | 'trust' | 'engagement' | 'special';
  
  // Badge criteria
  criteria: {
    type: 'auto' | 'manual';
    rules?: {
      field: string;
      operator: string;
      value: any;
    }[];
  };
  
  // Badge properties
  isActive: boolean;
  isPublic: boolean;
  priority: number; // for display order
  
  // Expiration
  hasExpiration: boolean;
  expirationDays?: number; // days until badge expires
  
  // Impact on trust score
  trustScoreBonus: number;
  
  // Stats
  totalEarned: number;
  activeCount: number;
}

const BadgeSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  iconBg: { type: String, default: 'bg-blue-500' },
  category: { 
    type: String, 
    enum: ['verification', 'performance', 'trust', 'engagement', 'special'],
    required: true,
    index: true
  },
  
  criteria: {
    type: { type: String, enum: ['auto', 'manual'], required: true },
    rules: [{
      field: { type: String },
      operator: { type: String },
      value: { type: Schema.Types.Mixed },
    }],
  },
  
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  
  hasExpiration: { type: Boolean, default: false },
  expirationDays: { type: Number },
  
  trustScoreBonus: { type: Number, default: 0 },
  
  totalEarned: { type: Number, default: 0 },
  activeCount: { type: Number, default: 0 },
}, { timestamps: true });

BadgeSchema.index({ slug: 1 });
BadgeSchema.index({ category: 1, isActive: 1 });

export default mongoose.model<IBadge>('Badge', BadgeSchema);
