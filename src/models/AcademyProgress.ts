import mongoose, { Schema, Document } from 'mongoose';

export interface IAcademyProgress extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  
  // Progress
  status: 'enrolled' | 'in-progress' | 'completed';
  progressPercent: number;
  
  // Completed lessons
  completedLessons: Array<{
    moduleIndex: number;
    lessonIndex: number;
    completedAt: Date;
  }>;
  
  // Quiz results
  quizResults: Array<{
    moduleIndex: number;
    lessonIndex: number;
    score: number;
    attempts: number;
    lastAttemptAt: Date;
  }>;
  
  // Certificate
  certificateEarned: boolean;
  certificateUrl?: string;
  certificateEarnedAt?: Date;
  
  // Timing
  enrolledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalTimeSpentMinutes: number;
  
  // Rating
  rating?: number;
  review?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const AcademyProgressSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: Schema.Types.ObjectId, ref: 'AcademyCourse', required: true, index: true },
  
  status: { 
    type: String, 
    enum: ['enrolled', 'in-progress', 'completed'],
    default: 'enrolled'
  },
  progressPercent: { type: Number, default: 0 },
  
  completedLessons: [{
    moduleIndex: { type: Number, required: true },
    lessonIndex: { type: Number, required: true },
    completedAt: { type: Date, default: Date.now },
  }],
  
  quizResults: [{
    moduleIndex: { type: Number, required: true },
    lessonIndex: { type: Number, required: true },
    score: { type: Number, required: true },
    attempts: { type: Number, default: 1 },
    lastAttemptAt: { type: Date, default: Date.now },
  }],
  
  certificateEarned: { type: Boolean, default: false },
  certificateUrl: { type: String },
  certificateEarnedAt: { type: Date },
  
  enrolledAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date },
  totalTimeSpentMinutes: { type: Number, default: 0 },
  
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String },
}, { timestamps: true });

AcademyProgressSchema.index({ user: 1, course: 1 }, { unique: true });

export default mongoose.model<IAcademyProgress>('AcademyProgress', AcademyProgressSchema);
