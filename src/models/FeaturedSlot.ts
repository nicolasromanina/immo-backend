import mongoose, { Schema, Document } from 'mongoose';

export interface IFeaturedSlot extends Document {
  // What is featured
  entityType: 'project' | 'promoteur';
  entity: mongoose.Types.ObjectId;
  
  // Placement
  placement: 'homepage' | 'search' | 'newsletter' | 'category' | 'city';
  position: number;
  
  // Visibility
  country?: string;
  city?: string;
  category?: string;
  
  // Schedule
  startDate: Date;
  endDate: Date;
  
  // Status
  status: 'scheduled' | 'active' | 'expired' | 'cancelled';
  
  // Type
  type: 'automatic' | 'manual' | 'paid';
  
  // For paid features
  payment?: {
    amount: number;
    currency: string;
    invoiceId?: mongoose.Types.ObjectId;
    paidAt?: Date;
  };
  
  // Performance
  impressions: number;
  clicks: number;
  
  // Notes
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const FeaturedSlotSchema: Schema = new Schema({
  entityType: { 
    type: String, 
    enum: ['project', 'promoteur'],
    required: true
  },
  entity: { 
    type: Schema.Types.ObjectId, 
    refPath: 'entityType',
    required: true,
    index: true
  },
  
  placement: { 
    type: String, 
    enum: ['homepage', 'search', 'newsletter', 'category', 'city'],
    required: true,
    index: true
  },
  position: { type: Number, default: 0 },
  
  country: { type: String },
  city: { type: String },
  category: { type: String },
  
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  
  status: { 
    type: String, 
    enum: ['scheduled', 'active', 'expired', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  
  type: { 
    type: String, 
    enum: ['automatic', 'manual', 'paid'],
    default: 'manual'
  },
  
  payment: {
    amount: { type: Number },
    currency: { type: String, default: 'XOF' },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    paidAt: { type: Date },
  },
  
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  
  notes: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

FeaturedSlotSchema.index({ placement: 1, status: 1, startDate: 1, endDate: 1 });
FeaturedSlotSchema.index({ entity: 1, entityType: 1 });

export default mongoose.model<IFeaturedSlot>('FeaturedSlot', FeaturedSlotSchema);
