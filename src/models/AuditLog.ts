import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  // Who did it
  actor: mongoose.Types.ObjectId;
  actorRole: string;
  
  // What was done
  action: string;
  category: 'auth' | 'project' | 'user' | 'promoteur' | 'lead' | 'document' | 'moderation' | 'appeal' | 'system';
  
  // Target
  targetType?: string;
  targetId?: mongoose.Types.ObjectId;
  
  // Details
  description: string;
  metadata?: any;
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  
  // Result
  success: boolean;
  errorMessage?: string;
  
  // Timestamp
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorRole: { type: String, required: true },
  
  action: { type: String, required: true, index: true },
  category: { 
    type: String, 
    enum: ['auth', 'project', 'user', 'promoteur', 'lead', 'document', 'moderation', 'appeal', 'system'],
    required: true,
    index: true
  },
  
  targetType: { type: String, index: true },
  targetId: { type: Schema.Types.ObjectId, index: true },
  
  description: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  
  ipAddress: { type: String },
  userAgent: { type: String },
  
  success: { type: Boolean, required: true, default: true },
  errorMessage: { type: String },
  
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false }); // We use custom timestamp field

AuditLogSchema.index({ actor: 1, timestamp: -1 });
AuditLogSchema.index({ category: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
