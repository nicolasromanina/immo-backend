import mongoose, { Schema, Document } from 'mongoose';

export interface ISanction extends Document {
  promoteur: mongoose.Types.ObjectId;
  targetType: 'promoteur' | 'project' | 'user';
  targetId: mongoose.Types.ObjectId;
  type: 'warning' | 'temporary-suspension' | 'permanent-suspension' | 'restriction';
  reason: string;
  manual: boolean;
  imposedBy?: mongoose.Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  revoked: boolean;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
}

const SanctionSchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', index: true },
  targetType: { type: String, enum: ['promoteur', 'project', 'user'], default: 'promoteur' },
  targetId: { type: Schema.Types.ObjectId, index: true },
  type: { type: String, enum: ['warning', 'temporary-suspension', 'permanent-suspension', 'restriction'], required: true },
  reason: { type: String, required: true },
  manual: { type: Boolean, default: true },
  imposedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  revoked: { type: Boolean, default: false },
  revokedAt: { type: Date },
  revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

SanctionSchema.index({ promoteur: 1, revoked: 1 });

export default mongoose.model<ISanction>('Sanction', SanctionSchema);
