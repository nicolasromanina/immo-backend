import mongoose, { Schema, Document } from 'mongoose';

export interface IManagedService extends Document {
  promoteur: mongoose.Types.ObjectId;
  type: 'full' | 'partial' | 'updates-only' | 'leads-only';
  status: 'pending' | 'active' | 'paused' | 'terminated';

  // What is delegated
  scope: {
    updateManagement: boolean;
    leadManagement: boolean;
    documentManagement: boolean;
    communicationManagement: boolean;
  };

  assignedManager?: mongoose.Types.ObjectId;

  // Pricing
  monthlyFee: number;
  currency: string;

  // Contract
  startDate: Date;
  endDate?: Date;

  // Activity log
  activityLog: Array<{
    action: string;
    performedBy: mongoose.Types.ObjectId;
    performedAt: Date;
    details: string;
  }>;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ManagedServiceSchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  type: {
    type: String,
    enum: ['full', 'partial', 'updates-only', 'leads-only'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'terminated'],
    default: 'pending',
    index: true,
  },
  scope: {
    updateManagement: { type: Boolean, default: false },
    leadManagement: { type: Boolean, default: false },
    documentManagement: { type: Boolean, default: false },
    communicationManagement: { type: Boolean, default: false },
  },
  assignedManager: { type: Schema.Types.ObjectId, ref: 'User' },
  monthlyFee: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  activityLog: [{
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, default: Date.now },
    details: { type: String },
  }],
  notes: { type: String },
}, { timestamps: true });

export default mongoose.model<IManagedService>('ManagedService', ManagedServiceSchema);
