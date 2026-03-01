import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumentAccessRequest extends Document {
  document: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  promoteur: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;

  status: 'pending' | 'approved' | 'denied';

  // Conversation associated with this request
  conversation?: mongoose.Types.ObjectId;

  // Notes from promoteur
  promoteurNotes?: string;

  // Timestamps
  requestedAt: Date;
  respondedAt?: Date;
  respondedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const DocumentAccessRequestSchema: Schema = new Schema(
  {
    document: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
      index: true,
    },

    conversation: { type: Schema.Types.ObjectId, ref: 'RealtimeConversation' },

    promoteurNotes: { type: String },

    requestedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
    respondedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes for efficient queries
DocumentAccessRequestSchema.index({ promoteur: 1, status: 1 });
DocumentAccessRequestSchema.index({ promoteur: 1, requestedAt: -1 });
DocumentAccessRequestSchema.index({ client: 1, status: 1 });
DocumentAccessRequestSchema.index({ document: 1, client: 1, status: 1 }, { unique: true });

export default mongoose.model<IDocumentAccessRequest>(
  'DocumentAccessRequest',
  DocumentAccessRequestSchema
);
