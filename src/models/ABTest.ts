import mongoose, { Schema, Document } from 'mongoose';

export interface IVariant {
  id: string;
  name: string;
  type: 'description' | 'image';
  content: string; // Description ou URL de l'image
  views: number;
  clicks: number;
  conversions: number;
}

export interface IABTest extends Document {
  projectId: mongoose.Types.ObjectId;
  promoteurId: mongoose.Types.ObjectId;
  projectName: string;
  testType: 'description' | 'image';
  description: string;
  variants: IVariant[];
  status: 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  minViews?: number; // Nombre minimal de vues avant conclusion
  winnerVariantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['description', 'image'], required: true },
  content: { type: String, required: true },
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
});

const ABTestSchema = new Schema<IABTest>(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    promoteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promoteur',
      required: true,
    },
    projectName: { type: String, required: true },
    testType: {
      type: String,
      enum: ['description', 'image'],
      required: true,
    },
    description: { type: String, required: true },
    variants: [VariantSchema],
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    minViews: { type: Number, default: 500 },
    winnerVariantId: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IABTest>('ABTest', ABTestSchema);
