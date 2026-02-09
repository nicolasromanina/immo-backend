import mongoose, { Schema, Document } from 'mongoose';

export interface IGDPRRequest extends Document {
  user: mongoose.Types.ObjectId;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  
  // Request details
  description?: string;
  
  // Processing
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  processingNotes?: string;
  
  // Response
  responseData?: any;
  responseFile?: string;
  rejectionReason?: string;
  
  // Deadline (GDPR requires response within 30 days)
  deadline: Date;
  
  // Verification
  identityVerified: boolean;
  verificationMethod?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const GDPRRequestSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'],
    required: true,
    index: true
  },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'rejected'],
    default: 'pending',
    index: true
  },
  
  description: { type: String },
  
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date },
  processingNotes: { type: String },
  
  responseData: { type: Schema.Types.Mixed },
  responseFile: { type: String },
  rejectionReason: { type: String },
  
  deadline: { type: Date, required: true },
  
  identityVerified: { type: Boolean, default: false },
  verificationMethod: { type: String },
}, { timestamps: true });

GDPRRequestSchema.index({ status: 1, deadline: 1 });

export default mongoose.model<IGDPRRequest>('GDPRRequest', GDPRRequestSchema);
