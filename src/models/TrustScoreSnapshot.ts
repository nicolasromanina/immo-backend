import mongoose, { Document, Schema } from 'mongoose';

export interface ITrustScoreSnapshot extends Document {
  promoteur: mongoose.Types.ObjectId;
  score: number;
  createdAt: Date;
}

const TrustScoreSnapshotSchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true },
  score: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

TrustScoreSnapshotSchema.index({ promoteur: 1, createdAt: -1 });

export default mongoose.model<ITrustScoreSnapshot>('TrustScoreSnapshot', TrustScoreSnapshotSchema);
