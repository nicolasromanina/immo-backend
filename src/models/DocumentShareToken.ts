import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumentShareToken extends Document {
  document: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  promoteur: mongoose.Types.ObjectId;
  token: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  expiresAt?: Date;
  accessCount: number;
  maxAccess?: number;
  password?: string;
  lastAccessedAt?: Date;
  status: 'active' | 'expired' | 'revoked';
}

const DocumentShareTokenSchema: Schema = new Schema({
  document: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  accessCount: { type: Number, default: 0 },
  maxAccess: { type: Number },
  password: { type: String }, // hashed
  lastAccessedAt: { type: Date },
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active',
    index: true
  },
}, { timestamps: true });

DocumentShareTokenSchema.index({ token: 1 });
DocumentShareTokenSchema.index({ status: 1, expiresAt: 1 });
DocumentShareTokenSchema.index({ document: 1, status: 1 });

export default mongoose.model<IDocumentShareToken>('DocumentShareToken', DocumentShareTokenSchema);