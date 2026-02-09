import mongoose, { Document, Schema } from 'mongoose';

export interface ICrisisAlert extends Document {
  type: 'reputational' | 'legal' | 'financial' | 'operational' | 'media';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'responding' | 'resolved' | 'escalated';
  title: string;
  description: string;
  affectedEntities: {
    promoteurs?: mongoose.Types.ObjectId[];
    projects?: mongoose.Types.ObjectId[];
    regions?: string[];
  };
  source: string;
  detectedBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  communications: {
    channel: 'email' | 'whatsapp' | 'sms' | 'in-app' | 'phone';
    sentAt: Date;
    recipients: string;
    message: string;
    sentBy: mongoose.Types.ObjectId;
  }[];
  actions: {
    action: string;
    performedBy: mongoose.Types.ObjectId;
    performedAt: Date;
    notes?: string;
  }[];
  resolution?: {
    resolvedAt: Date;
    resolvedBy: mongoose.Types.ObjectId;
    summary: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const crisisAlertSchema = new Schema<ICrisisAlert>({
  type: {
    type: String,
    enum: ['reputational', 'legal', 'financial', 'operational', 'media'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
  },
  status: {
    type: String,
    enum: ['detected', 'investigating', 'responding', 'resolved', 'escalated'],
    default: 'detected',
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  affectedEntities: {
    promoteurs: [{ type: Schema.Types.ObjectId, ref: 'Promoteur' }],
    projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    regions: [String],
  },
  source: { type: String, required: true },
  detectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  communications: [{
    channel: { type: String, enum: ['email', 'whatsapp', 'sms', 'in-app', 'phone'] },
    sentAt: { type: Date, default: Date.now },
    recipients: String,
    message: String,
    sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
  }],
  actions: [{
    action: String,
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now },
    notes: String,
  }],
  resolution: {
    resolvedAt: Date,
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    summary: String,
  },
}, { timestamps: true });

crisisAlertSchema.index({ status: 1, severity: 1 });
crisisAlertSchema.index({ type: 1, status: 1 });

export default mongoose.model<ICrisisAlert>('CrisisAlert', crisisAlertSchema);
