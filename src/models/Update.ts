import mongoose, { Schema, Document } from 'mongoose';

// Geolocated photo interface for construction site verification
export interface IGeolocatedPhoto {
  url: string;
  // Timestamp metadata
  capturedAt: Date;
  uploadedAt: Date;
  // Geolocation data
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number; // in meters
    altitude?: number;
  };
  // Device/EXIF metadata
  deviceInfo?: {
    deviceId?: string;
    deviceModel?: string;
    platform?: 'ios' | 'android' | 'web';
  };
  // Verification status
  verified: boolean;
  verificationScore?: number; // 0-100, based on geolocation match with project
  verificationDetails?: {
    distanceFromProject?: number; // in meters
    timestampValid?: boolean;
    geoMatch?: boolean;
  };
}

export interface IUpdate extends Document {
  project: mongoose.Types.ObjectId;
  promoteur: mongoose.Types.ObjectId;
  
  // Update content
  title: string;
  description: string;
  
  // Required format: 3 photos + what's done + next step + date + risks
  photos: string[]; // Legacy: simple URLs (for backward compatibility)
  geolocatedPhotos?: IGeolocatedPhoto[]; // New: photos with geolocation data
  whatsDone: string;
  nextStep: string;
  nextMilestoneDate: Date;
  risksIdentified: string;
  
  // Status
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: Date;
  publishedAt?: Date;
  
  // Milestone tracking
  milestone?: {
    name: string;
    percentage: number; // 0-100
    phase: 'fondations' | 'structure' | 'gros-oeuvre' | 'finitions' | 'livre';
  };
  
  // Engagement
  views: number;
  reactions: Array<{
    userId: mongoose.Types.ObjectId;
    type: 'like' | 'helpful';
    reactedAt: Date;
  }>;
  
  // Moderation
  flagged: boolean;
  flagReason?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const UpdateSchema: Schema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  
  photos: { 
    type: [String], 
    required: true,
    validate: {
      validator: function(v: string[]) {
        return v && v.length === 3;
      },
      message: 'Exactly 3 photos are required for each update'
    }
  },
  geolocatedPhotos: [{
    url: { type: String, required: true },
    capturedAt: { type: Date, required: true },
    uploadedAt: { type: Date, default: Date.now },
    geolocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      altitude: { type: Number },
    },
    deviceInfo: {
      deviceId: { type: String },
      deviceModel: { type: String },
      platform: { type: String, enum: ['ios', 'android', 'web'] },
    },
    verified: { type: Boolean, default: false },
    verificationScore: { type: Number, min: 0, max: 100 },
    verificationDetails: {
      distanceFromProject: { type: Number },
      timestampValid: { type: Boolean },
      geoMatch: { type: Boolean },
    },
  }],
  whatsDone: { type: String, required: true },
  nextStep: { type: String, required: true },
  nextMilestoneDate: { type: Date, required: true },
  risksIdentified: { type: String, required: true },
  
  status: { 
    type: String, 
    enum: ['draft', 'scheduled', 'published'],
    default: 'draft'
  },
  scheduledFor: { type: Date },
  publishedAt: { type: Date },
  
  milestone: {
    name: { type: String },
    percentage: { type: Number, min: 0, max: 100 },
    phase: { 
      type: String, 
      enum: ['fondations', 'structure', 'gros-oeuvre', 'finitions', 'livre']
    },
  },
  
  views: { type: Number, default: 0 },
  reactions: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'helpful'], required: true },
    reactedAt: { type: Date, default: Date.now },
  }],
  
  flagged: { type: Boolean, default: false },
  flagReason: { type: String },
}, { timestamps: true });

UpdateSchema.index({ project: 1, publishedAt: -1 });
UpdateSchema.index({ promoteur: 1, status: 1 });
UpdateSchema.index({ status: 1, scheduledFor: 1 });

export default mongoose.model<IUpdate>('Update', UpdateSchema);
