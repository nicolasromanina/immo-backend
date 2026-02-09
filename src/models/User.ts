import mongoose, { Schema, Document } from 'mongoose';
import { Role } from '../config/roles';

export interface IUser extends Document {
  email: string;
  password: string;
  roles: Role[];
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  city?: string;
  avatar?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: 'active' | 'suspended' | 'banned';
  lastLogin?: Date;
  preferences?: {
    language: 'fr' | 'en';
    currency: string;
    notifications: {
      email: boolean;
      whatsapp: boolean;
      projectUpdates: boolean;
      newLeads: boolean;
    };
  };
  // For Promoteur users
  promoteurProfile?: mongoose.Types.ObjectId;
  // For Client users
  clientProfile?: {
    budget?: number;
    projectType?: 'villa' | 'immeuble' | 'both';
    preferredCountries?: string[];
    preferredCities?: string[];
    deliveryTimeline?: string;
  };
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  roles: { type: [String], enum: Object.values(Role), default: [Role.USER] },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  phone: { type: String, trim: true },
  country: { type: String },
  city: { type: String },
  avatar: { type: String },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  lastLogin: { type: Date },
  preferences: {
    language: { type: String, enum: ['fr', 'en'], default: 'fr' },
    currency: { type: String, default: 'XOF' },
    notifications: {
      email: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
      projectUpdates: { type: Boolean, default: true },
      newLeads: { type: Boolean, default: true },
    },
  },
  promoteurProfile: { type: Schema.Types.ObjectId, ref: 'Promoteur' },
  clientProfile: {
    budget: { type: Number },
    projectType: { type: String, enum: ['villa', 'immeuble', 'both'] },
    preferredCountries: [{ type: String }],
    preferredCities: [{ type: String }],
    deliveryTimeline: { type: String },
  },
}, { timestamps: true });

UserSchema.index({ email: 1 });
UserSchema.index({ roles: 1 });
UserSchema.index({ status: 1 });

export default mongoose.model<IUser>('User', UserSchema);
