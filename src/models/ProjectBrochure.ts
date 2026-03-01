import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectBrochure extends Document {
  project: mongoose.Types.ObjectId;
  promoteur: mongoose.Types.ObjectId;

  // File info
  fileName: string;
  fileSize: number; // in bytes
  fileType: string; // 'pdf', 'document', etc.
  fileUrl: string; // S3 or storage URL

  // Metadata
  title?: string;
  description?: string;

  // Tracking
  uploadedAt: Date;
  uploadedBy: mongoose.Types.ObjectId;
  lastUpdatedAt?: Date;

  // Stats
  totalDownloads: number;
  lastDownloadedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ProjectBrochureSchema: Schema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },

  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  fileUrl: { type: String, required: true },

  title: { type: String },
  description: { type: String },

  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdatedAt: { type: Date },

  totalDownloads: { type: Number, default: 0 },
  lastDownloadedAt: { type: Date },
}, { timestamps: true });

// Index for fast lookups
ProjectBrochureSchema.index({ project: 1 });
ProjectBrochureSchema.index({ promoteur: 1 });
ProjectBrochureSchema.index({ project: 1, promoteur: 1 });

export default mongoose.model<IProjectBrochure>('ProjectBrochure', ProjectBrochureSchema);
