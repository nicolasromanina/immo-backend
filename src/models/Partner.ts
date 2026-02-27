import mongoose, { Schema, Document } from 'mongoose';

export interface IPartner extends Document {
  name: string;
  type: 'inspection' | 'courtier' | 'notaire' | 'banque' | 'assurance' | 'architecte' | 'autre';
  description: string;
  logo?: string;
  
  // Contact
  email: string;
  phone: string;
  website?: string;
  address?: string;
  
  // Status
  status: 'pending' | 'active' | 'suspended';
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  
  // Coverage
  countries: string[];
  cities: string[];
  
  // Stats
  totalRequests: number;
  completedRequests: number;
  averageRating: number;
  
  // Badge/Featured
  isFeatured: boolean;
  badges: string[];
  
  // Commission
  commissionRate?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const PartnerSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['inspection', 'courtier', 'notaire', 'banque', 'assurance', 'architecte', 'autre'],
    required: true,
    index: true
  },
  description: { type: String, required: true },
  logo: { type: String },
  
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true },
  website: { type: String },
  address: { type: String },
  
  status: { 
    type: String, 
    enum: ['pending', 'active', 'suspended'],
    default: 'pending',
    index: true
  },
  verifiedAt: { type: Date },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  countries: [{ type: String }],
  cities: [{ type: String }],
  
  totalRequests: { type: Number, default: 0 },
  completedRequests: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  
  isFeatured: { type: Boolean, default: false },
  badges: [{ type: String }],
  
  commissionRate: { type: Number },
}, { timestamps: true });

PartnerSchema.index({ type: 1, status: 1 });
// Avoid compound index on two array fields (Mongo "parallel arrays" limitation).
PartnerSchema.index({ countries: 1 });
PartnerSchema.index({ cities: 1 });

export default mongoose.model<IPartner>('Partner', PartnerSchema);
