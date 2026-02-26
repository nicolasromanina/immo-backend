import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  client: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  promoteur: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  status: 'pending' | 'published' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema({
  client: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending' },
}, { timestamps: true });

// Un client ne peut laisser qu'un seul review par projet
ReviewSchema.index({ client: 1, project: 1 }, { unique: true });
ReviewSchema.index({ project: 1, status: 1 });
ReviewSchema.index({ promoteur: 1, status: 1 });

export default mongoose.model<IReview>('Review', ReviewSchema);
