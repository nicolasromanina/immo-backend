import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadScoringConfig extends Document {
  name: string;
  isActive: boolean;
  
  // Score ranges
  scoreRanges: {
    A: { min: number; max: number };
    B: { min: number; max: number };
    C: { min: number; max: number };
    D: { min: number; max: number };
  };
  
  // Scoring criteria weights
  weights: {
    budgetMatch: number;
    timelineMatch: number;
    financingType: number;
    profileCompleteness: number;
    engagement: number;
    source: number;
  };
  
  // Budget scoring
  budgetScoring: {
    exactMatch: number;
    within10Percent: number;
    within25Percent: number;
    over25Percent: number;
  };
  
  // Timeline scoring
  timelineScoring: {
    immediate: number;
    threeMonths: number;
    sixMonths: number;
    oneYear: number;
    flexible: number;
  };
  
  // Financing type scoring
  financingScoring: {
    cash: number;
    mortgage: number;
    mixed: number;
    unknown: number;
  };
  
  // Source scoring
  sourceScoring: {
    website: number;
    whatsapp: number;
    referral: number;
    direct: number;
    other: number;
  };
  
  // SLA thresholds (hours)
  slaThresholds: {
    scoreA: number;
    scoreB: number;
    scoreC: number;
    scoreD: number;
  };
  
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const LeadScoringConfigSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: false },
  
  scoreRanges: {
    A: { min: { type: Number, default: 80 }, max: { type: Number, default: 100 } },
    B: { min: { type: Number, default: 60 }, max: { type: Number, default: 79 } },
    C: { min: { type: Number, default: 40 }, max: { type: Number, default: 59 } },
    D: { min: { type: Number, default: 0 }, max: { type: Number, default: 39 } },
  },
  
  weights: {
    budgetMatch: { type: Number, default: 25 },
    timelineMatch: { type: Number, default: 20 },
    financingType: { type: Number, default: 20 },
    profileCompleteness: { type: Number, default: 15 },
    engagement: { type: Number, default: 10 },
    source: { type: Number, default: 10 },
  },
  
  budgetScoring: {
    exactMatch: { type: Number, default: 100 },
    within10Percent: { type: Number, default: 80 },
    within25Percent: { type: Number, default: 50 },
    over25Percent: { type: Number, default: 20 },
  },
  
  timelineScoring: {
    immediate: { type: Number, default: 100 },
    threeMonths: { type: Number, default: 80 },
    sixMonths: { type: Number, default: 60 },
    oneYear: { type: Number, default: 40 },
    flexible: { type: Number, default: 30 },
  },
  
  financingScoring: {
    cash: { type: Number, default: 100 },
    mortgage: { type: Number, default: 70 },
    mixed: { type: Number, default: 80 },
    unknown: { type: Number, default: 30 },
  },
  
  sourceScoring: {
    website: { type: Number, default: 60 },
    whatsapp: { type: Number, default: 70 },
    referral: { type: Number, default: 100 },
    direct: { type: Number, default: 80 },
    other: { type: Number, default: 40 },
  },
  
  slaThresholds: {
    scoreA: { type: Number, default: 2 },
    scoreB: { type: Number, default: 8 },
    scoreC: { type: Number, default: 24 },
    scoreD: { type: Number, default: 48 },
  },
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<ILeadScoringConfig>('LeadScoringConfig', LeadScoringConfigSchema);
