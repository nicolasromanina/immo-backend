import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceRequest extends Document {
  client: mongoose.Types.ObjectId;
  partner?: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId;
  
  // Request details
  type: 'inspection' | 'courtier' | 'notaire' | 'banque' | 'assurance' | 'autre' | 'devis-architecte' | 'consultation-notaire';
  metadata?: Record<string, any>;
  description: string;
  
  // Status
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  
  // Assignment
  assignedAt?: Date;
  completedAt?: Date;
  
  // Notes
  notes: Array<{
    content: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
  }>;
  
  // Rating
  rating?: number;
  review?: string;
  
  // Documents
  documents: Array<{
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const ServiceRequestSchema: Schema = new Schema({
  client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  partner: { type: Schema.Types.ObjectId, ref: 'Partner', index: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  
  type: { 
    type: String, 
    enum: ['inspection', 'courtier', 'notaire', 'banque', 'assurance', 'autre', 'devis-architecte', 'consultation-notaire'],
    required: true,
    index: true
  },
  description: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  
  status: { 
    type: String, 
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  assignedAt: { type: Date },
  completedAt: { type: Date },
  
  notes: [{
    content: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
  }],
  
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String },
  
  documents: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

ServiceRequestSchema.index({ client: 1, status: 1 });
ServiceRequestSchema.index({ partner: 1, status: 1 });

export default mongoose.model<IServiceRequest>('ServiceRequest', ServiceRequestSchema);
