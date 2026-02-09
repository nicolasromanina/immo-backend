import mongoose, { Schema, Document } from 'mongoose';

export interface IAcademyCourse extends Document {
  title: string;
  slug: string;
  description: string;
  category: 'onboarding' | 'projects' | 'leads' | 'marketing' | 'compliance' | 'advanced';
  
  // Content
  modules: Array<{
    title: string;
    order: number;
    lessons: Array<{
      title: string;
      type: 'video' | 'article' | 'quiz';
      content?: string;
      videoUrl?: string;
      durationMinutes: number;
      order: number;
    }>;
  }>;
  
  // Requirements
  targetAudience: 'promoteur' | 'admin' | 'all';
  requiredPlan?: 'basique' | 'standard' | 'premium';
  prerequisites: mongoose.Types.ObjectId[];
  
  // Certification
  hasCertificate: boolean;
  certificateTemplate?: string;
  passingScore?: number; // percentage
  
  // Stats
  enrollments: number;
  completions: number;
  averageRating: number;
  
  // Status
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const AcademyCourseSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['onboarding', 'projects', 'leads', 'marketing', 'compliance', 'advanced'],
    required: true,
    index: true
  },
  
  modules: [{
    title: { type: String, required: true },
    order: { type: Number, required: true },
    lessons: [{
      title: { type: String, required: true },
      type: { type: String, enum: ['video', 'article', 'quiz'], required: true },
      content: { type: String },
      videoUrl: { type: String },
      durationMinutes: { type: Number, default: 0 },
      order: { type: Number, required: true },
    }],
  }],
  
  targetAudience: { 
    type: String, 
    enum: ['promoteur', 'admin', 'all'],
    default: 'promoteur'
  },
  requiredPlan: { type: String, enum: ['basique', 'standard', 'premium'] },
  prerequisites: [{ type: Schema.Types.ObjectId, ref: 'AcademyCourse' }],
  
  hasCertificate: { type: Boolean, default: false },
  certificateTemplate: { type: String },
  passingScore: { type: Number },
  
  enrollments: { type: Number, default: 0 },
  completions: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  publishedAt: { type: Date },
}, { timestamps: true });

export default mongoose.model<IAcademyCourse>('AcademyCourse', AcademyCourseSchema);
