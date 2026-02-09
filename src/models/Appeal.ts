import mongoose, { Schema, Document } from 'mongoose';

export interface IAppeal extends Document {
  promoteur: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;
  
  // Appeal details
  type: 'suspension' | 'restriction' | 'rejection' | 'badge-removal' | 'score-penalty' | 'other';
  reason: string;
  description: string;
  
  // Original sanction/action
  originalAction: {
    type: string;
    appliedBy: mongoose.Types.ObjectId;
    appliedAt: Date;
    reason: string;
  };
  
  // Evidence
  evidence: Array<{
    type: 'document' | 'screenshot' | 'explanation' | 'other';
    url?: string;
    description: string;
    uploadedAt: Date;
  }>;
  
  // Mitigation plan
  mitigationPlan: string;
  
  // Appeal status
  status: 'pending' | 'under-review' | 'escalated' | 'approved' | 'rejected';
  level: 1 | 2; // N1 (72h) or N2 (7j)
  
  // Assignment
  assignedTo?: mongoose.Types.ObjectId;
  
  // Timeline
  submittedAt: Date;
  reviewStartedAt?: Date;
  resolvedAt?: Date;
  deadline: Date;
  
  // Review notes
  reviewNotes: Array<{
    note: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
    isInternal: boolean;
  }>;
  
  // Decision
  decision?: {
    outcome: 'approved' | 'partially-approved' | 'rejected';
    explanation: string;
    decidedBy: mongoose.Types.ObjectId;
    decidedAt: Date;
    newAction?: {
      type: string;
      details: string;
    };
  };
  
  // Escalation
  escalated: boolean;
  escalationReason?: string;
  escalatedAt?: Date;
  escalatedBy?: mongoose.Types.ObjectId;
}

const AppealSchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  
  type: { 
    type: String, 
    enum: ['suspension', 'restriction', 'rejection', 'badge-removal', 'score-penalty', 'other'],
    required: true,
    index: true
  },
  reason: { type: String, required: true },
  description: { type: String, required: true },
  
  originalAction: {
    type: { type: String, required: true },
    appliedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appliedAt: { type: Date, required: true },
    reason: { type: String, required: true },
  },
  
  evidence: [{
    type: { type: String, enum: ['document', 'screenshot', 'explanation', 'other'], required: true },
    url: { type: String },
    description: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
  
  mitigationPlan: { type: String, required: true },
  
  status: { 
    type: String, 
    enum: ['pending', 'under-review', 'escalated', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  level: { type: Number, enum: [1, 2], default: 1 },
  
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  
  submittedAt: { type: Date, default: Date.now },
  reviewStartedAt: { type: Date },
  resolvedAt: { type: Date },
  deadline: { type: Date, required: true, index: true },
  
  reviewNotes: [{
    note: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
    isInternal: { type: Boolean, default: false },
  }],
  
  decision: {
    outcome: { type: String, enum: ['approved', 'partially-approved', 'rejected'] },
    explanation: { type: String },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    newAction: {
      type: { type: String },
      details: { type: String },
    },
  },
  
  escalated: { type: Boolean, default: false },
  escalationReason: { type: String },
  escalatedAt: { type: Date },
  escalatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

AppealSchema.index({ promoteur: 1, status: 1 });
AppealSchema.index({ status: 1, deadline: 1 });
AppealSchema.index({ assignedTo: 1, status: 1 });

export default mongoose.model<IAppeal>('Appeal', AppealSchema);
