import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportTicket extends Document {
  ticketNumber: string;
  user: mongoose.Types.ObjectId;

  // Ticket details
  category: 'technical' | 'account' | 'billing' | 'feature-request' | 'bug-report' | 'other';
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Status
  status: 'open' | 'in-progress' | 'waiting-user' | 'waiting-admin' | 'resolved' | 'closed';
  assignedTo?: mongoose.Types.ObjectId;

  // Messages thread
  messages: Array<{
    sender: mongoose.Types.ObjectId;
    senderRole: 'user' | 'admin' | 'support' | 'system';
    content: string;
    attachments?: string[];
    sentAt: Date;
    isInternal: boolean; // internal notes not visible to user
  }>;

  // SLA
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;

  // Satisfaction
  satisfaction?: {
    rating: number; // 1-5
    comment?: string;
    submittedAt: Date;
  };

  // Tags
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema: Schema = new Schema({
  ticketNumber: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  category: {
    type: String,
    enum: ['technical', 'account', 'billing', 'feature-request', 'bug-report', 'other'],
    required: true,
    index: true,
  },
  subject: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true,
  },

  status: {
    type: String,
    enum: ['open', 'in-progress', 'waiting-user', 'waiting-admin', 'resolved', 'closed'],
    default: 'open',
    index: true,
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },

  messages: [{
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['user', 'admin', 'support', 'system'], required: true },
    content: { type: String, required: true },
    attachments: [{ type: String }],
    sentAt: { type: Date, default: Date.now },
    isInternal: { type: Boolean, default: false },
  }],

  firstResponseAt: { type: Date },
  resolvedAt: { type: Date },
  closedAt: { type: Date },

  satisfaction: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    submittedAt: { type: Date },
  },

  tags: [{ type: String }],
}, { timestamps: true });

SupportTicketSchema.index({ status: 1, priority: 1 });
SupportTicketSchema.index({ ticketNumber: 1 });
SupportTicketSchema.index({ assignedTo: 1, status: 1 });

SupportTicketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('SupportTicket').countDocuments();
    this.ticketNumber = `TK-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export default mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
