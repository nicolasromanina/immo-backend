import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  project: mongoose.Types.ObjectId;
  promoteur: mongoose.Types.ObjectId;
  
  // Document info
  name: string;
  type: string; // PDF, image, etc.
  category: 'foncier' | 'plans' | 'permis' | 'contrats' | 'financier' | 'technique' | 'autre';
  url: string;
  size: number; // in bytes
  
  // Visibility
  visibility: 'public' | 'private' | 'shared';
  sharedWith: mongoose.Types.ObjectId[]; // Users who have access (for private documents)
  
  // Status
  status: 'fourni' | 'manquant' | 'expire' | 'en-attente';
  expiresAt?: Date;
  
  // Versioning
  version: number;
  previousVersions: Array<{
    url: string;
    uploadedAt: Date;
    replacedBy: mongoose.Types.ObjectId;
  }>;
  
  // Verification
  verified: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  verificationNotes?: string;
  
  // Upload info
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  
  // Description
  description?: string;
  tags: string[];
  
  // Admin notes
  adminNotes: Array<{
    note: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
  }>;
}

const DocumentSchema: Schema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['foncier', 'plans', 'permis', 'contrats', 'financier', 'technique', 'autre'],
    required: true,
    index: true
  },
  url: { type: String, required: true },
  size: { type: Number, required: true },
  
  visibility: { 
    type: String, 
    enum: ['public', 'private', 'shared'],
    default: 'private',
    index: true
  },
  sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  
  status: { 
    type: String, 
    enum: ['fourni', 'manquant', 'expire', 'en-attente'],
    default: 'fourni',
    index: true
  },
  expiresAt: { type: Date },
  
  version: { type: Number, default: 1 },
  previousVersions: [{
    url: { type: String, required: true },
    uploadedAt: { type: Date, required: true },
    replacedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  }],
  
  verified: { type: Boolean, default: false },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  verificationNotes: { type: String },
  
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
  
  description: { type: String },
  tags: [{ type: String }],
  
  adminNotes: [{
    note: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

DocumentSchema.index({ project: 1, category: 1 });
DocumentSchema.index({ promoteur: 1, status: 1 });
DocumentSchema.index({ visibility: 1 });
DocumentSchema.index({ expiresAt: 1 });

export default mongoose.model<IDocument>('Document', DocumentSchema);
