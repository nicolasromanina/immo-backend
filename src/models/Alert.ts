import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  user: mongoose.Types.ObjectId;
  
  // Alert type
  type: 'new-project' | 'update-published' | 'status-change' | 'price-change' | 'similar-project' | 'deadline-approaching' | 'favorite-update' | 'promoteur-verified';
  
  // Target
  project?: mongoose.Types.ObjectId;
  promoteur?: mongoose.Types.ObjectId;
  
  // Trigger criteria
  criteria: {
    countries?: string[];
    cities?: string[];
    projectTypes?: ('villa' | 'immeuble')[];
    budgetMin?: number;
    budgetMax?: number;
    minTrustScore?: number;
    verifiedOnly?: boolean;
  };
  
  // Alert settings
  isActive: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  channels: ('email' | 'whatsapp' | 'sms' | 'push')[];
  
  // Alert content
  title: string;
  message: string;
  link?: string;
  
  // Delivery
  sentAt?: Date;
  readAt?: Date;
  isRead: boolean;
  
  // Stats
  triggerCount: number;
  lastTriggeredAt?: Date;
}

const AlertSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  type: { 
    type: String, 
    enum: ['new-project', 'update-published', 'status-change', 'price-change', 'similar-project', 'deadline-approaching', 'favorite-update', 'promoteur-verified'],
    required: true,
    index: true
  },
  
  project: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', index: true },
  
  criteria: {
    countries: [{ type: String }],
    cities: [{ type: String }],
    projectTypes: [{ type: String, enum: ['villa', 'immeuble'] }],
    budgetMin: { type: Number },
    budgetMax: { type: Number },
    minTrustScore: { type: Number },
    verifiedOnly: { type: Boolean, default: false },
  },
  
  isActive: { type: Boolean, default: true, index: true },
  frequency: { 
    type: String, 
    enum: ['instant', 'daily', 'weekly'],
    default: 'instant'
  },
  channels: [{ 
    type: String, 
    enum: ['email', 'whatsapp', 'sms', 'push'],
    default: ['email']
  }],
  
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String },
  
  sentAt: { type: Date },
  readAt: { type: Date },
  isRead: { type: Boolean, default: false },
  
  triggerCount: { type: Number, default: 0 },
  lastTriggeredAt: { type: Date },
}, { timestamps: true });

AlertSchema.index({ user: 1, isActive: 1 });
AlertSchema.index({ user: 1, isRead: 1 });
AlertSchema.index({ type: 1, isActive: 1 });

export default mongoose.model<IAlert>('Alert', AlertSchema);
