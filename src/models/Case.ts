import mongoose, { Schema, Document } from 'mongoose';

export interface ICase extends Document {
  // Case identification
  caseNumber: string;
  type: 'litige' | 'doute' | 'signalement' | 'plainte' | 'enquete';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Parties involved
  reporter: mongoose.Types.ObjectId; // User who reported
  reporterType: 'client' | 'promoteur' | 'admin' | 'system';
  
  subject: mongoose.Types.ObjectId; // User/Promoteur being reported
  subjectType: 'promoteur' | 'project' | 'update' | 'document' | 'lead';
  
  project?: mongoose.Types.ObjectId;
  
  // Case details
  title: string;
  description: string;
  category: 'fraude' | 'contenu-suspect' | 'retard-injustifie' | 'non-reponse' | 'info-incorrecte' | 'autre';
  
  // Evidence
  evidence: Array<{
    type: 'screenshot' | 'document' | 'url' | 'text' | 'other';
    url?: string;
    description: string;
    uploadedAt: Date;
  }>;
  
  // Status & Assignment
  status: 'nouveau' | 'en-cours' | 'attente-info' | 'resolu' | 'ferme' | 'escalade';
  assignedTo?: mongoose.Types.ObjectId;
  assignedTeam?: string; // 'trust-safety', 'legal', 'support', etc.
  
  // Timeline
  reportedAt: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  
  // SLA
  slaDeadline: Date;
  slaBreached: boolean;
  
  // Investigation
  investigationNotes: Array<{
    note: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
    isInternal: boolean;
    attachments?: string[];
  }>;
  
  // Communication with parties
  communications: Array<{
    from: mongoose.Types.ObjectId;
    to: mongoose.Types.ObjectId;
    message: string;
    sentAt: Date;
    isInternal: boolean;
  }>;
  
  // Resolution
  resolution?: {
    outcome: 'valid' | 'invalid' | 'partially-valid' | 'dismissed';
    explanation: string;
    actionTaken?: string;
    resolvedBy: mongoose.Types.ObjectId;
    resolvedAt: Date;
  };
  
  // Follow-up actions
  actions: Array<{
    type: 'warning' | 'restriction' | 'suspension' | 'content-removal' | 'other';
    description: string;
    appliedBy: mongoose.Types.ObjectId;
    appliedAt: Date;
    targetId: mongoose.Types.ObjectId;
  }>;
  
  // Related cases
  relatedCases: mongoose.Types.ObjectId[];
  
  // Feedback
  reporterFeedback?: {
    satisfied: boolean;
    comment?: string;
    submittedAt: Date;
  };
}

const CaseSchema: Schema = new Schema({
  caseNumber: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['litige', 'doute', 'signalement', 'plainte', 'enquete'],
    required: true,
    index: true
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reporterType: { 
    type: String, 
    enum: ['client', 'promoteur', 'admin', 'system'],
    required: true
  },
  
  subject: { type: Schema.Types.ObjectId, required: true, index: true },
  subjectType: { 
    type: String, 
    enum: ['promoteur', 'project', 'update', 'document', 'lead'],
    required: true
  },
  
  project: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['fraude', 'contenu-suspect', 'retard-injustifie', 'non-reponse', 'info-incorrecte', 'autre'],
    required: true,
    index: true
  },
  
  evidence: [{
    type: { type: String, enum: ['screenshot', 'document', 'url', 'text', 'other'], required: true },
    url: { type: String },
    description: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
  
  status: { 
    type: String, 
    enum: ['nouveau', 'en-cours', 'attente-info', 'resolu', 'ferme', 'escalade'],
    default: 'nouveau',
    index: true
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  assignedTeam: { type: String },
  
  reportedAt: { type: Date, default: Date.now },
  firstResponseAt: { type: Date },
  resolvedAt: { type: Date },
  closedAt: { type: Date },
  
  slaDeadline: { type: Date, required: true },
  slaBreached: { type: Boolean, default: false },
  
  investigationNotes: [{
    note: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
    isInternal: { type: Boolean, default: true },
    attachments: [{ type: String }],
  }],
  
  communications: [{
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    isInternal: { type: Boolean, default: false },
  }],
  
  resolution: {
    outcome: { type: String, enum: ['valid', 'invalid', 'partially-valid', 'dismissed'] },
    explanation: { type: String },
    actionTaken: { type: String },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  
  actions: [{
    type: { type: String, enum: ['warning', 'restriction', 'suspension', 'content-removal', 'other'], required: true },
    description: { type: String, required: true },
    appliedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appliedAt: { type: Date, default: Date.now },
    targetId: { type: Schema.Types.ObjectId, required: true },
  }],
  
  relatedCases: [{ type: Schema.Types.ObjectId, ref: 'Case' }],
  
  reporterFeedback: {
    satisfied: { type: Boolean },
    comment: { type: String },
    submittedAt: { type: Date },
  },
}, { timestamps: true });

CaseSchema.index({ caseNumber: 1 });
CaseSchema.index({ status: 1, priority: 1 });
CaseSchema.index({ assignedTo: 1, status: 1 });
CaseSchema.index({ type: 1, category: 1 });

// Auto-generate case number
CaseSchema.pre('save', async function(next) {
  if (!this.caseNumber) {
    const count = await mongoose.model('Case').countDocuments();
    this.caseNumber = `CASE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model<ICase>('Case', CaseSchema);
