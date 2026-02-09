import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Notification details
  type: 'lead' | 'update' | 'project' | 'badge' | 'appeal' | 'system' | 'warning';
  title: string;
  message: string;
  
  // Related entities
  relatedProject?: mongoose.Types.ObjectId;
  relatedLead?: mongoose.Types.ObjectId;
  relatedUpdate?: mongoose.Types.ObjectId;
  relatedAppeal?: mongoose.Types.ObjectId;
  
  // Delivery channels
  channels: {
    email: boolean;
    whatsapp: boolean;
    inApp: boolean;
  };
  
  // Status
  read: boolean;
  readAt?: Date;
  
  // Action
  actionUrl?: string;
  actionLabel?: string;
  
  // Priority
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Scheduling
  scheduledFor?: Date;
  sentAt?: Date;
}

const NotificationSchema: Schema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  type: { 
    type: String, 
    enum: ['lead', 'update', 'project', 'badge', 'appeal', 'system', 'warning'],
    required: true,
    index: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  relatedProject: { type: Schema.Types.ObjectId, ref: 'Project' },
  relatedLead: { type: Schema.Types.ObjectId, ref: 'Lead' },
  relatedUpdate: { type: Schema.Types.ObjectId, ref: 'Update' },
  relatedAppeal: { type: Schema.Types.ObjectId, ref: 'Appeal' },
  
  channels: {
    email: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
  },
  
  read: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
  
  actionUrl: { type: String },
  actionLabel: { type: String },
  
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  scheduledFor: { type: Date },
  sentAt: { type: Date },
}, { timestamps: true });

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ priority: 1, read: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
