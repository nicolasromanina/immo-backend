import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplate extends Document {
  name: string;
  slug: string;
  type: 'whatsapp' | 'email' | 'sms' | 'brochure' | 'faq';
  category: 'objection-diaspora' | 'welcome' | 'follow-up' | 'reminder' | 'update' | 'custom';
  
  // Template content
  subject?: string; // for email
  content: string;
  variables: string[]; // ${projectName}, ${clientName}, etc.
  
  // Target
  targetAudience: 'client' | 'promoteur' | 'both';
  language: 'fr' | 'en';
  
  // Usage & Stats
  isActive: boolean;
  isPublic: boolean; // Can promoteurs see/use this?
  usageCount: number;
  
  // Tags for search
  tags: string[];
  description?: string;
  
  // Created by
  createdBy: mongoose.Types.ObjectId;
  
  // For WhatsApp specific
  whatsappType?: 'text' | 'media' | 'button' | 'list';
  mediaUrl?: string;
  buttons?: Array<{
    text: string;
    action: string;
  }>;
}

const TemplateSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  type: { 
    type: String, 
    enum: ['whatsapp', 'email', 'sms', 'brochure', 'faq'],
    required: true,
    index: true
  },
  category: { 
    type: String, 
    enum: ['objection-diaspora', 'welcome', 'follow-up', 'reminder', 'update', 'custom'],
    required: true,
    index: true
  },
  
  subject: { type: String, trim: true },
  content: { type: String, required: true },
  variables: [{ type: String }],
  
  targetAudience: { 
    type: String, 
    enum: ['client', 'promoteur', 'both'],
    default: 'both'
  },
  language: { 
    type: String, 
    enum: ['fr', 'en'],
    default: 'fr',
    index: true
  },
  
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
  
  tags: [{ type: String, lowercase: true }],
  description: { type: String },
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  whatsappType: { 
    type: String, 
    enum: ['text', 'media', 'button', 'list']
  },
  mediaUrl: { type: String },
  buttons: [{
    text: { type: String, required: true },
    action: { type: String, required: true },
  }],
}, { timestamps: true });

TemplateSchema.index({ type: 1, category: 1, isActive: 1 });
TemplateSchema.index({ slug: 1 });
TemplateSchema.index({ tags: 1 });

export default mongoose.model<ITemplate>('Template', TemplateSchema);
