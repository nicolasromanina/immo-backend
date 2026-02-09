import mongoose, { Schema, Document } from 'mongoose';

export interface ICRMWebhook extends Document {
  promoteur: mongoose.Types.ObjectId;
  enabled: boolean;
  url: string;
  secret?: string;
  events: string[];
  lastError?: string;
  lastSuccessAt?: Date;
}

const CRMWebhookSchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, unique: true },
  enabled: { type: Boolean, default: false },
  url: { type: String, required: true },
  secret: { type: String },
  events: [{ type: String }],
  lastError: { type: String },
  lastSuccessAt: { type: Date },
}, { timestamps: true });

export default mongoose.model<ICRMWebhook>('CRMWebhook', CRMWebhookSchema);
