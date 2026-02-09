import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMessage extends Document {
  promoteur: mongoose.Types.ObjectId;
  lead: mongoose.Types.ObjectId;
  to: string;
  direction: 'outbound' | 'inbound';
  templateSlug?: string;
  content: string;
  status: 'queued' | 'sent' | 'failed';
  errorMessage?: string;
  sentAt?: Date;
}

const WhatsAppMessageSchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  to: { type: String, required: true },
  direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
  templateSlug: { type: String },
  content: { type: String, required: true },
  status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
  errorMessage: { type: String },
  sentAt: { type: Date },
}, { timestamps: true });

export default mongoose.model<IWhatsAppMessage>('WhatsAppMessage', WhatsAppMessageSchema);
