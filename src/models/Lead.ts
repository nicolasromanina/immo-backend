import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  project: mongoose.Types.ObjectId;
  promoteur: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Lead details
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  
  // Qualification
  budget: number;
  financingType: 'cash' | 'mortgage' | 'mixed' | 'unknown';
  timeframe: 'immediate' | '3-months' | '6-months' | '1-year' | 'flexible';
  interestedTypology?: string;
  
  // Scoring
  score: 'A' | 'B' | 'C' | 'D';
  scoreDetails: {
    budgetMatch: number; // 0-100
    timelineMatch: number;
    engagementLevel: number;
    profileCompleteness: number;
  };
  
  // Status & Pipeline
  status: 'nouveau' | 'contacte' | 'rdv-planifie' | 'visite-effectuee' | 'proposition-envoyee' | 'negocie' | 'gagne' | 'perdu';
  pipeline: Array<{
    status: string;
    changedAt: Date;
    changedBy: mongoose.Types.ObjectId;
    notes?: string;
  }>;
  
  // Communication
  contactMethod: 'email' | 'whatsapp' | 'phone' | 'rdv';
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  
  // Meeting
  meetingScheduled?: {
    date: Date;
    type: 'visio' | 'physique' | 'phone';
    notes?: string;
    calendarLink?: string;
  };
  
  // Message/Notes
  initialMessage: string;
  notes: Array<{
    content: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
    isPrivate: boolean;
  }>;
  
  // Documents sent
  documentsSent: Array<{
    documentId: mongoose.Types.ObjectId;
    sentAt: Date;
    viewed: boolean;
  }>;
  
  // SLA & Response
  responseTime?: number; // hours
  responseSLA: boolean; // met SLA or not
  
  // Source
  source: 'contact-form' | 'document-access-request' | 'brochure-request' | 'appointment-request' | 'website' | 'whatsapp' | 'referral' | 'direct' | 'other';
  referralCode?: string;

  // Tags for lead management
  tags: string[]; // 'not-contacted', 'contacted', 'urgent', 'follow-up', etc.

  // Contact tracking for notifications
  firstContactDate?: Date; // When promoteur first contacts the lead
  notContactedReminderSent?: Date; // When 2-day reminder was sent

  // Quality flags
  isSerious: boolean;
  flaggedAsNotSerious: boolean;
  flagReason?: string;

  // Assignment
  assignedTo?: mongoose.Types.ObjectId; // team member

  // Conversion
  converted: boolean;
  conversionDate?: Date;
  conversionValue?: number;
  lostReason?: string;
}

const LeadSchema: Schema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  client: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  whatsapp: { type: String, trim: true },
  
  budget: { type: Number, required: true },
  financingType: { 
    type: String, 
    enum: ['cash', 'mortgage', 'mixed', 'unknown'],
    default: 'unknown'
  },
  timeframe: { 
    type: String, 
    enum: ['immediate', '3-months', '6-months', '1-year', 'flexible'],
    required: true
  },
  interestedTypology: { type: String },
  
  score: { 
    type: String, 
    enum: ['A', 'B', 'C', 'D'],
    required: true,
    index: true
  },
  scoreDetails: {
    budgetMatch: { type: Number, min: 0, max: 100 },
    timelineMatch: { type: Number, min: 0, max: 100 },
    engagementLevel: { type: Number, min: 0, max: 100 },
    profileCompleteness: { type: Number, min: 0, max: 100 },
  },
  
  status: { 
    type: String, 
    enum: ['nouveau', 'contacte', 'rdv-planifie', 'visite-effectuee', 'proposition-envoyee', 'negocie', 'gagne', 'perdu'],
    default: 'nouveau',
    index: true
  },
  pipeline: [{
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
  }],
  
  contactMethod: { 
    type: String, 
    enum: ['email', 'whatsapp', 'phone', 'rdv'],
    required: true
  },
  lastContactDate: { type: Date },
  nextFollowUpDate: { type: Date, index: true },
  
  meetingScheduled: {
    date: { type: Date },
    type: { type: String, enum: ['visio', 'physique', 'phone'] },
    notes: { type: String },
    calendarLink: { type: String },
  },
  
  initialMessage: { type: String, required: true },
  notes: [{
    content: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: false },
  }],
  
  documentsSent: [{
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    sentAt: { type: Date, default: Date.now },
    viewed: { type: Boolean, default: false },
  }],
  
  responseTime: { type: Number },
  responseSLA: { type: Boolean, default: true, index: true },
  
  source: {
    type: String,
    enum: ['contact-form', 'document-access-request', 'brochure-request', 'appointment-request', 'website', 'whatsapp', 'referral', 'direct', 'other'],
    default: 'other'
  },
  referralCode: { type: String },

  tags: {
    type: [String],
    default: ['not-contacted'],
    index: true,
  },

  firstContactDate: { type: Date },
  notContactedReminderSent: { type: Date },

  isSerious: { type: Boolean, default: true },
  flaggedAsNotSerious: { type: Boolean, default: false },
  flagReason: { type: String },

  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },

  converted: { type: Boolean, default: false, index: true },
  conversionDate: { type: Date },
  conversionValue: { type: Number },
  lostReason: { type: String },
}, { timestamps: true });

LeadSchema.index({ promoteur: 1, status: 1, score: 1 });
LeadSchema.index({ project: 1, status: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ email: 1 });
LeadSchema.index({ tags: 1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ promoteur: 1, tags: 1 }); // For filtering leads by promoteur and tags
LeadSchema.index({ createdAt: 1, tags: 1, notContactedReminderSent: 1 }); // For 2-day reminder job

export default mongoose.model<ILead>('Lead', LeadSchema);
