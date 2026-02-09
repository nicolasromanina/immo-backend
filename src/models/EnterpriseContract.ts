import mongoose, { Schema, Document } from 'mongoose';

export interface IEnterpriseContract extends Document {
  promoteur: mongoose.Types.ObjectId;
  
  // Contract details
  contractNumber: string;
  name: string;
  
  // Pricing
  pricing: {
    type: 'fixed' | 'custom' | 'volume';
    baseAmount: number;
    currency: string;
    billingCycle: 'monthly' | 'quarterly' | 'annual';
    volumeDiscounts?: Array<{
      minProjects: number;
      discountPercent: number;
    }>;
  };
  
  // Inclusions
  inclusions: {
    maxProjects: number; // -1 for unlimited
    maxTeamMembers: number;
    maxLeadsPerMonth: number;
    dedicatedSupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    priorityListing: boolean;
    customReports: boolean;
  };
  
  // SLA
  sla: {
    supportResponseTimeHours: number;
    uptimeGuarantee: number;
    dedicatedAccountManager: boolean;
    accountManagerId?: mongoose.Types.ObjectId;
  };
  
  // Terms
  terms: {
    startDate: Date;
    endDate: Date;
    autoRenew: boolean;
    noticePeriodDays: number;
    terminationClause?: string;
  };
  
  // Status
  status: 'draft' | 'pending_approval' | 'active' | 'expired' | 'terminated';
  
  // Signatures
  signedByPromoteur: boolean;
  signedByPromoteurAt?: Date;
  signedByAdmin: boolean;
  signedByAdminAt?: Date;
  signedByAdminUserId?: mongoose.Types.ObjectId;
  
  // Documents
  contractDocument?: string;
  amendments: Array<{
    description: string;
    documentUrl?: string;
    effectiveDate: Date;
    createdAt: Date;
  }>;
  
  // Notes
  notes: Array<{
    content: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
  }>;
  
  createdBy: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const EnterpriseContractSchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  
  contractNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  
  pricing: {
    type: { type: String, enum: ['fixed', 'custom', 'volume'], required: true },
    baseAmount: { type: Number, required: true },
    currency: { type: String, default: 'XOF' },
    billingCycle: { type: String, enum: ['monthly', 'quarterly', 'annual'], default: 'annual' },
    volumeDiscounts: [{
      minProjects: { type: Number, required: true },
      discountPercent: { type: Number, required: true },
    }],
  },
  
  inclusions: {
    maxProjects: { type: Number, default: -1 },
    maxTeamMembers: { type: Number, default: 10 },
    maxLeadsPerMonth: { type: Number, default: -1 },
    dedicatedSupport: { type: Boolean, default: true },
    customBranding: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    priorityListing: { type: Boolean, default: true },
    customReports: { type: Boolean, default: false },
  },
  
  sla: {
    supportResponseTimeHours: { type: Number, default: 4 },
    uptimeGuarantee: { type: Number, default: 99.9 },
    dedicatedAccountManager: { type: Boolean, default: true },
    accountManagerId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  
  terms: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    autoRenew: { type: Boolean, default: true },
    noticePeriodDays: { type: Number, default: 30 },
    terminationClause: { type: String },
  },
  
  status: { 
    type: String, 
    enum: ['draft', 'pending_approval', 'active', 'expired', 'terminated'],
    default: 'draft',
    index: true
  },
  
  signedByPromoteur: { type: Boolean, default: false },
  signedByPromoteurAt: { type: Date },
  signedByAdmin: { type: Boolean, default: false },
  signedByAdminAt: { type: Date },
  signedByAdminUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  
  contractDocument: { type: String },
  amendments: [{
    description: { type: String, required: true },
    documentUrl: { type: String },
    effectiveDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  
  notes: [{
    content: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
  }],
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model<IEnterpriseContract>('EnterpriseContract', EnterpriseContractSchema);
