import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganizationInvitation extends Document {
  promoteur: mongoose.Types.ObjectId;
  email: string;
  role: 'commercial' | 'technique' | 'admin';
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedBy: mongoose.Types.ObjectId;
  invitedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: mongoose.Types.ObjectId;
}

const OrganizationInvitationSchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  role: {
    type: String,
    enum: ['commercial', 'technique', 'admin'],
    required: true
  },
  token: { type: String, required: true, unique: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending',
    index: true
  },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  invitedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  acceptedAt: { type: Date },
  acceptedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

OrganizationInvitationSchema.index({ token: 1 });
OrganizationInvitationSchema.index({ email: 1, promoteur: 1 });
OrganizationInvitationSchema.index({ expiresAt: 1 });

export default mongoose.model<IOrganizationInvitation>('OrganizationInvitation', OrganizationInvitationSchema);