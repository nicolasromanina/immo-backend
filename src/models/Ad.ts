import mongoose, { Document, Schema } from 'mongoose';

export interface IAd extends Document {
  promoteur: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: 'banner' | 'spotlight' | 'sponsored-listing' | 'push-notification' | 'email-blast';
  status: 'draft' | 'pending-review' | 'active' | 'paused' | 'rejected' | 'completed' | 'expired';
  targeting: {
    cities?: string[];
    countries?: string[];
    priceRange?: { min?: number; max?: number };
    projectTypes?: string[];
    audienceType?: ('visitors' | 'registered' | 'active-leads')[];
  };
  budget: {
    totalBudget: number;
    dailyBudget?: number;
    spent: number;
    currency: string;
  };
  schedule: {
    startDate: Date;
    endDate: Date;
  };
  creative: {
    imageUrl?: string;
    linkUrl?: string;
    callToAction?: string;
  };
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
  };
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const adSchema = new Schema<IAd>({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: ['banner', 'spotlight', 'sponsored-listing', 'push-notification', 'email-blast'],
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'pending-review', 'active', 'paused', 'rejected', 'completed', 'expired'],
    default: 'draft',
  },
  targeting: {
    cities: [String],
    countries: [String],
    priceRange: {
      min: Number,
      max: Number,
    },
    projectTypes: [String],
    audienceType: [{ type: String, enum: ['visitors', 'registered', 'active-leads'] }],
  },
  budget: {
    totalBudget: { type: Number, required: true },
    dailyBudget: Number,
    spent: { type: Number, default: 0 },
    currency: { type: String, default: 'XOF' },
  },
  schedule: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  creative: {
    imageUrl: String,
    linkUrl: String,
    callToAction: { type: String, default: 'En savoir plus' },
  },
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
  },
  rejectionReason: String,
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

adSchema.index({ promoteur: 1, status: 1 });
adSchema.index({ status: 1, 'schedule.startDate': 1, 'schedule.endDate': 1 });
adSchema.index({ type: 1, status: 1 });

export default mongoose.model<IAd>('Ad', adSchema);
