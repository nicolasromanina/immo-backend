import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectQuestion extends Document {
  project: mongoose.Types.ObjectId;
  promoteur: mongoose.Types.ObjectId;
  askedBy: mongoose.Types.ObjectId;
  question: string;
  answer?: string;
  status: 'pending' | 'answered' | 'rejected' | 'archived';
  answeredBy?: mongoose.Types.ObjectId;
  answeredAt?: Date;
  isPublic: boolean;
  upvotes: number;
  upvotedBy: mongoose.Types.ObjectId[];
}

const ProjectQuestionSchema: Schema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  askedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  question: { type: String, required: true, trim: true },
  answer: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'answered', 'rejected', 'archived'],
    default: 'pending',
    index: true
  },
  answeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  answeredAt: { type: Date },
  isPublic: { type: Boolean, default: false, index: true },
  upvotes: { type: Number, default: 0, index: true },
  upvotedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

ProjectQuestionSchema.index({ project: 1, status: 1 });
ProjectQuestionSchema.index({ promoteur: 1, status: 1 });
ProjectQuestionSchema.index({ upvotes: -1 });
ProjectQuestionSchema.index({ createdAt: -1 });

export default mongoose.model<IProjectQuestion>('ProjectQuestion', ProjectQuestionSchema);