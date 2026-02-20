import mongoose, { Schema, Document } from 'mongoose';

export interface IComparison extends Document {
  user: mongoose.Types.ObjectId;
  projects: mongoose.Types.ObjectId[]; // Max 3 projects
  
  // Comparison metrics (calculated)
  metrics: {
    trustScores: number[];
    prices: number[];
    deliveryDates: Date[];
    updateFrequencies: number[];
    documentCounts: number[];
    leadResponseTimes: number[];
  };
  
  // User notes
  notes?: string;
  
  // Shared comparison
  isShared: boolean;
  shareToken?: string;
  sharedWith: mongoose.Types.ObjectId[];
  
  // Decision
  decision?: {
    selectedProject: mongoose.Types.ObjectId;
    reason: string;
    decidedAt: Date;
  };
  
  // Stats
  viewCount: number;
  lastViewedAt: Date;
}

const ComparisonSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projects: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    validate: {
      validator: function(v: any[]) {
        return Array.isArray(v) && v.length >= 2 && v.length <= 3;
      },
      message: 'Must compare 2 or 3 projects'
    }
  },
  
  metrics: {
    trustScores: [{ type: Number }],
    prices: [{ type: Number }],
    deliveryDates: [{ type: Date }],
    updateFrequencies: [{ type: Number }],
    documentCounts: [{ type: Number }],
    leadResponseTimes: [{ type: Number }],
  },
  
  notes: { type: String },
  
  isShared: { type: Boolean, default: false },
  shareToken: { type: String, unique: true, sparse: true },
  sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  
  decision: {
    selectedProject: { type: Schema.Types.ObjectId, ref: 'Project' },
    reason: { type: String },
    decidedAt: { type: Date },
  },
  
  viewCount: { type: Number, default: 0 },
  lastViewedAt: { type: Date, default: Date.now },
}, { timestamps: true });

ComparisonSchema.index({ user: 1, createdAt: -1 });
ComparisonSchema.index({ shareToken: 1 });

export default mongoose.model<IComparison>('Comparison', ComparisonSchema);
