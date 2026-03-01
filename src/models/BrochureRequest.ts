import mongoose, { Schema, Document } from 'mongoose';

export interface IBrochureRequest extends Document {
  project: mongoose.Types.ObjectId;
  promoteur: mongoose.Types.ObjectId;
  client?: mongoose.Types.ObjectId;

  // Requester info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;

  // Status
  status: 'pending' | 'sent' | 'failed';

  // Delivery
  sentAt?: Date;
  sentVia: 'email' | 'whatsapp' | 'both';
  downloadLink?: string;
  downloadedAt?: Date;

  // Tracking
  emailOpened: boolean;
  emailOpenedAt?: Date;

  // Source
  source: 'website' | 'whatsapp' | 'direct';

  // Lead and conversation
  lead?: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const BrochureRequestSchema: Schema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  client: { type: Schema.Types.ObjectId, ref: 'User', index: true },

  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String },

  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },

  sentAt: { type: Date },
  sentVia: {
    type: String,
    enum: ['email', 'whatsapp', 'both'],
    default: 'email'
  },
  downloadLink: { type: String },
  downloadedAt: { type: Date },

  emailOpened: { type: Boolean, default: false },
  emailOpenedAt: { type: Date },

  source: {
    type: String,
    enum: ['website', 'whatsapp', 'direct'],
    default: 'website'
  },

  // Lead and conversation
  lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
  conversation: { type: Schema.Types.ObjectId, ref: 'RealtimeConversation' },
}, { timestamps: true });

BrochureRequestSchema.index({ project: 1, email: 1 });

export default mongoose.model<IBrochureRequest>('BrochureRequest', BrochureRequestSchema);
