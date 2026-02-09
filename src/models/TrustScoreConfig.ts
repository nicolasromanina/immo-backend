import mongoose, { Schema, Document } from 'mongoose';

export interface ITrustScoreConfig extends Document {
  // Config identifier
  name: string;
  isActive: boolean;
  
  // Weights for different factors (total should = 100)
  weights: {
    kyc: number;
    documents: number;
    updates: number;
    responseTime: number;
    projectCompletion: number;
    reviews: number;
    badges: number;
  };
  
  // Thresholds for project types
  thresholds: {
    villa: {
      publishedMin: number;
      conformeMin: number;
      verifieMin: number;
    };
    immeuble: {
      publishedMin: number;
      conformeMin: number;
      verifieMin: number;
    };
  };
  
  // Update frequency requirements (days)
  updateFrequency: {
    minimum: number;
    ideal: number;
    maxPenalty: number; // Max score penalty for no updates
  };
  
  // Response time SLA (hours)
  responseTimeSLA: {
    excellent: number;
    good: number;
    acceptable: number;
  };
  
  // Gaming detection thresholds
  gamingDetection: {
    minUpdateIntervalHours: number;
    maxDailyUpdates: number;
    suspiciousPatternsEnabled: boolean;
  };
  
  // Bonus points
  bonusPoints: {
    verifiedBadge: number;
    completeProfile: number;
    quickResponder: number;
    consistentUpdater: number;
  };
  
  // Penalty points
  penalties: {
    noUpdatesWeek: number;
    noUpdatesMonth: number;
    missedSLA: number;
    rejectedDocument: number;
    complaint: number;
  };
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const TrustScoreConfigSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: false },
  
  weights: {
    kyc: { type: Number, default: 20 },
    documents: { type: Number, default: 15 },
    updates: { type: Number, default: 20 },
    responseTime: { type: Number, default: 15 },
    projectCompletion: { type: Number, default: 15 },
    reviews: { type: Number, default: 10 },
    badges: { type: Number, default: 5 },
  },
  
  thresholds: {
    villa: {
      publishedMin: { type: Number, default: 0 },
      conformeMin: { type: Number, default: 50 },
      verifieMin: { type: Number, default: 70 },
    },
    immeuble: {
      publishedMin: { type: Number, default: 0 },
      conformeMin: { type: Number, default: 60 },
      verifieMin: { type: Number, default: 80 },
    },
  },
  
  updateFrequency: {
    minimum: { type: Number, default: 30 },
    ideal: { type: Number, default: 14 },
    maxPenalty: { type: Number, default: 20 },
  },
  
  responseTimeSLA: {
    excellent: { type: Number, default: 2 },
    good: { type: Number, default: 8 },
    acceptable: { type: Number, default: 24 },
  },
  
  gamingDetection: {
    minUpdateIntervalHours: { type: Number, default: 4 },
    maxDailyUpdates: { type: Number, default: 5 },
    suspiciousPatternsEnabled: { type: Boolean, default: true },
  },
  
  bonusPoints: {
    verifiedBadge: { type: Number, default: 5 },
    completeProfile: { type: Number, default: 3 },
    quickResponder: { type: Number, default: 5 },
    consistentUpdater: { type: Number, default: 5 },
  },
  
  penalties: {
    noUpdatesWeek: { type: Number, default: 5 },
    noUpdatesMonth: { type: Number, default: 15 },
    missedSLA: { type: Number, default: 3 },
    rejectedDocument: { type: Number, default: 5 },
    complaint: { type: Number, default: 10 },
  },
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<ITrustScoreConfig>('TrustScoreConfig', TrustScoreConfigSchema);
