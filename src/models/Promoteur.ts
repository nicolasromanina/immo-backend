import mongoose, { Schema, Document } from 'mongoose';

export interface IPromoteur extends Document {
  user: mongoose.Types.ObjectId;
  organizationName: string;
  organizationType: 'individual' | 'small' | 'established' | 'enterprise';
  
  // Plan & Subscription
  plan: 'basique' | 'standard' | 'premium';
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'suspended';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  trialEndsAt?: Date;
  
  // KYC & Verification
  kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
  kycDocuments: Array<{
    type: string;
    url: string;
    status: 'pending' | 'verified' | 'rejected';
    uploadedAt: Date;
  }>;
  agrementNumber?: string;
  hasAgrement: boolean;
  
  // Onboarding
  onboardingCompleted: boolean;
  onboardingProgress: number; // 0-100
  onboardingChecklist: Array<{
    code?: string;
    item: string;
    completed: boolean;
    completedAt?: Date;
  }>;

  // Compliance workflow
  complianceStatus: 'publie' | 'conforme' | 'verifie';
  complianceRequest?: {
    requestedStatus: 'conforme' | 'verifie';
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    requestedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: mongoose.Types.ObjectId;
    reason?: string;
  };
  
  // Financial Capacity
  financialProofLevel: 'none' | 'basic' | 'medium' | 'high';
  financialProofDocuments: Array<{
    url: string;
    uploadedAt: Date;
  }>;
  
  // Trust Score & Badges
  trustScore: number; // 0-100
  badges: Array<{
    badgeId: mongoose.Types.ObjectId;
    earnedAt: Date;
    expiresAt?: Date;
  }>;
  
  // Company info
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  website?: string;
  description?: string;
  logo?: string;
  
  // Team members
  teamMembers: Array<{
    userId: mongoose.Types.ObjectId;
    role: 'commercial' | 'technique' | 'admin';
    addedAt: Date;
  }>;
  
  // Stats
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalLeadsReceived: number;
  averageResponseTime?: number; // in hours
  
  // Restrictions & Sanctions
  restrictions: Array<{
    type: string;
    reason: string;
    appliedAt: Date;
    expiresAt?: Date;
  }>;
  
  // Payment info
  stripeCustomerId?: string;
  paymentHistory: Array<{
    amount: number;
    type: 'subscription' | 'onboarding' | 'addon' | 'upgrade';
    status: 'pending' | 'paid' | 'failed';
    date: Date;
  }>;
  
  // Plan change requests
  planChangeRequest?: {
    requestedPlan: 'basique' | 'standard' | 'premium' | null;
    requestType: 'upgrade' | 'downgrade' | 'cancel';
    requestedAt: Date;
    effectiveDate?: Date;
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
  };
}

const PromoteurSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  organizationName: { type: String, required: true, trim: true },
  organizationType: { 
    type: String, 
    enum: ['individual', 'small', 'established', 'enterprise'],
    default: 'small'
  },
  
  plan: { 
    type: String, 
    enum: ['basique', 'standard', 'premium'],
    default: 'basique'
  },
  subscriptionStatus: { 
    type: String, 
    enum: ['trial', 'active', 'expired', 'suspended'],
    default: 'trial'
  },
  subscriptionStartDate: { type: Date },
  subscriptionEndDate: { type: Date },
  trialEndsAt: { type: Date },
  
  kycStatus: { 
    type: String, 
    enum: ['pending', 'submitted', 'verified', 'rejected'],
    default: 'pending'
  },
  kycDocuments: [{
    type: { type: String, required: true },
    url: { type: String, required: true },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  agrementNumber: { type: String },
  hasAgrement: { type: Boolean, default: false },
  
  onboardingCompleted: { type: Boolean, default: false },
  onboardingProgress: { type: Number, default: 0, min: 0, max: 100 },
  onboardingChecklist: [{
    code: { type: String, trim: true },
    item: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  }],

  complianceStatus: {
    type: String,
    enum: ['publie', 'conforme', 'verifie'],
    default: 'publie',
    index: true,
  },
  complianceRequest: {
    requestedStatus: { type: String, enum: ['conforme', 'verifie'] },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'] },
    requestedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
  },
  
  financialProofLevel: { 
    type: String, 
    enum: ['none', 'basic', 'medium', 'high'],
    default: 'none'
  },
  financialProofDocuments: [{
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
  
  trustScore: { type: Number, default: 0, min: 0, max: 100 },
  badges: [{
    badgeId: { type: Schema.Types.ObjectId, ref: 'Badge', required: true },
    earnedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
  }],
  
  companyAddress: { type: String },
  companyPhone: { type: String },
  companyEmail: { type: String },
  website: { type: String },
  description: { type: String },
  logo: { type: String },
  
  teamMembers: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['commercial', 'technique', 'admin'], required: true },
    addedAt: { type: Date, default: Date.now },
  }],
  
  totalProjects: { type: Number, default: 0 },
  activeProjects: { type: Number, default: 0 },
  completedProjects: { type: Number, default: 0 },
  totalLeadsReceived: { type: Number, default: 0 },
  averageResponseTime: { type: Number },
  
  restrictions: [{
    type: { type: String, required: true },
    reason: { type: String, required: true },
    appliedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
  }],
  
  stripeCustomerId: { type: String, unique: true, sparse: true },
  
  paymentHistory: [{
    amount: { type: Number, required: true },
    type: { type: String, enum: ['subscription', 'onboarding', 'addon', 'upgrade'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    date: { type: Date, default: Date.now },
  }],
  
  planChangeRequest: {
    requestedPlan: { type: String, enum: ['basique', 'standard', 'premium', null] },
    requestType: { type: String, enum: ['upgrade', 'downgrade', 'cancel'] },
    requestedAt: { type: Date, default: Date.now },
    effectiveDate: { type: Date },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reason: { type: String },
  },
}, { timestamps: true });

PromoteurSchema.index({ user: 1 });
PromoteurSchema.index({ plan: 1, subscriptionStatus: 1 });
PromoteurSchema.index({ trustScore: -1 });
PromoteurSchema.index({ kycStatus: 1 });

export default mongoose.model<IPromoteur>('Promoteur', PromoteurSchema);
