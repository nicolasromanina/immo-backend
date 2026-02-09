import mongoose, { Schema, Document } from 'mongoose';

export interface IConsent extends Document {
  user: mongoose.Types.ObjectId;
  
  // Consent types
  consents: Array<{
    type: 'marketing' | 'analytics' | 'thirdParty' | 'newsletter' | 'communication';
    granted: boolean;
    grantedAt?: Date;
    revokedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
  }>;
  
  // Cookie preferences
  cookiePreferences: {
    essential: boolean; // Always true
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
  };
  
  // History
  history: Array<{
    action: 'grant' | 'revoke' | 'update';
    type: string;
    timestamp: Date;
    ipAddress?: string;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const ConsentSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  consents: [{
    type: { 
      type: String, 
      enum: ['marketing', 'analytics', 'thirdParty', 'newsletter', 'communication'],
      required: true 
    },
    granted: { type: Boolean, default: false },
    grantedAt: { type: Date },
    revokedAt: { type: Date },
    ipAddress: { type: String },
    userAgent: { type: String },
  }],
  
  cookiePreferences: {
    essential: { type: Boolean, default: true },
    analytics: { type: Boolean, default: false },
    marketing: { type: Boolean, default: false },
    functional: { type: Boolean, default: true },
  },
  
  history: [{
    action: { type: String, enum: ['grant', 'revoke', 'update'], required: true },
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String },
  }],
}, { timestamps: true });

export default mongoose.model<IConsent>('Consent', ConsentSchema);
