import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  reportedBy: mongoose.Types.ObjectId;
  
  // What's being reported
  targetType: 'project' | 'update' | 'document' | 'promoteur';
  targetId: mongoose.Types.ObjectId;
  
  // Report details
  reason: 'fraud' | 'misleading' | 'outdated' | 'inappropriate' | 'spam' | 'other';
  description: string;
  evidence?: string[];
  
  // Status
  status: 'pending' | 'under-review' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high';
  
  // Assignment
  assignedTo?: mongoose.Types.ObjectId;
  
  // Resolution
  resolution?: {
    action: string;
    notes: string;
    resolvedBy: mongoose.Types.ObjectId;
    resolvedAt: Date;
  };
  
  // Investigation notes
  investigationNotes: Array<{
    note: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
  }>;
}

const ReportSchema: Schema = new Schema({
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  targetType: { 
    type: String, 
    enum: ['project', 'update', 'document', 'promoteur'],
    required: true,
    index: true
  },
  targetId: { type: Schema.Types.ObjectId, required: true, index: true },
  
  reason: { 
    type: String, 
    enum: ['fraud', 'misleading', 'outdated', 'inappropriate', 'spam', 'other'],
    required: true
  },
  description: { type: String, required: true },
  evidence: [{ type: String }],
  
  status: { 
    type: String, 
    enum: ['pending', 'under-review', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  },
  
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  
  resolution: {
    action: { type: String },
    notes: { type: String },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  
  investigationNotes: [{
    note: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

ReportSchema.index({ targetType: 1, targetId: 1 });
ReportSchema.index({ status: 1, priority: -1 });
ReportSchema.index({ assignedTo: 1, status: 1 });

export default mongoose.model<IReport>('Report', ReportSchema);
