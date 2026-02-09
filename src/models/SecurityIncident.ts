import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityIncident extends Document {
  // Incident details
  title: string;
  type: 'data_breach' | 'unauthorized_access' | 'fraud' | 'phishing' | 'ddos' | 'malware' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  
  // Status
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'closed';
  
  // Affected entities
  affectedUsers: mongoose.Types.ObjectId[];
  affectedPromoteurs: mongoose.Types.ObjectId[];
  affectedProjects: mongoose.Types.ObjectId[];
  
  // Timeline
  detectedAt: Date;
  containedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  
  // Response
  responseActions: Array<{
    action: string;
    performedBy: mongoose.Types.ObjectId;
    performedAt: Date;
    notes?: string;
  }>;
  
  // Investigation
  investigationNotes: Array<{
    note: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
  }>;
  rootCause?: string;
  
  // Notifications
  notificationsSent: Array<{
    type: 'email' | 'sms' | 'inApp';
    recipientType: 'affected_users' | 'all_users' | 'admins' | 'regulators';
    sentAt: Date;
    content: string;
  }>;
  
  // Reporting
  regulatoryReportRequired: boolean;
  regulatoryReportSubmittedAt?: Date;
  regulatoryReportRef?: string;
  
  // Assigned team
  assignedTo: mongoose.Types.ObjectId[];
  leadInvestigator?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const SecurityIncidentSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['data_breach', 'unauthorized_access', 'fraud', 'phishing', 'ddos', 'malware', 'other'],
    required: true,
    index: true
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  description: { type: String, required: true },
  
  status: { 
    type: String, 
    enum: ['detected', 'investigating', 'contained', 'resolved', 'closed'],
    default: 'detected',
    index: true
  },
  
  affectedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  affectedPromoteurs: [{ type: Schema.Types.ObjectId, ref: 'Promoteur' }],
  affectedProjects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
  
  detectedAt: { type: Date, required: true, default: Date.now },
  containedAt: { type: Date },
  resolvedAt: { type: Date },
  closedAt: { type: Date },
  
  responseActions: [{
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, default: Date.now },
    notes: { type: String },
  }],
  
  investigationNotes: [{
    note: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
  }],
  rootCause: { type: String },
  
  notificationsSent: [{
    type: { type: String, enum: ['email', 'sms', 'inApp'], required: true },
    recipientType: { type: String, enum: ['affected_users', 'all_users', 'admins', 'regulators'], required: true },
    sentAt: { type: Date, default: Date.now },
    content: { type: String, required: true },
  }],
  
  regulatoryReportRequired: { type: Boolean, default: false },
  regulatoryReportSubmittedAt: { type: Date },
  regulatoryReportRef: { type: String },
  
  assignedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  leadInvestigator: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

SecurityIncidentSchema.index({ status: 1, severity: 1 });

export default mongoose.model<ISecurityIncident>('SecurityIncident', SecurityIncidentSchema);
