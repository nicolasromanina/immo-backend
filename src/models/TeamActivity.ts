import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamActivity extends Document {
  promoteur: mongoose.Types.ObjectId;
  actor: mongoose.Types.ObjectId; // team member who performed the action
  action: 'created' | 'updated' | 'deleted' | 'assigned' | 'status_changed' | 'note_added' | 'viewed';
  category: 'lead' | 'project' | 'team' | 'permission' | 'assignment';
  
  targetType: string; // 'lead', 'project', 'team_member'
  targetId?: mongoose.Types.ObjectId;
  targetName?: string;
  
  details: {
    before?: any;
    after?: any;
    changes?: Record<string, { old: any; new: any }>;
  };
  
  leadAssignment?: {
    leadId: mongoose.Types.ObjectId;
    assignedTo: mongoose.Types.ObjectId;
    assignedBy: mongoose.Types.ObjectId;
  };
  
  timestamp: Date;
}

const TeamActivitySchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { 
    type: String, 
    enum: ['created', 'updated', 'deleted', 'assigned', 'status_changed', 'note_added', 'viewed'],
    required: true,
    index: true
  },
  category: { 
    type: String, 
    enum: ['lead', 'project', 'team', 'permission', 'assignment'],
    required: true,
    index: true
  },
  
  targetType: { type: String, required: true, index: true },
  targetId: { type: Schema.Types.ObjectId, index: true },
  targetName: { type: String },
  
  details: {
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    changes: { type: Schema.Types.Mixed },
  },
  
  leadAssignment: {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

TeamActivitySchema.index({ promoteur: 1, timestamp: -1 });
TeamActivitySchema.index({ actor: 1, timestamp: -1 });
TeamActivitySchema.index({ category: 1, action: 1, timestamp: -1 });

export default mongoose.model<ITeamActivity>('TeamActivity', TeamActivitySchema);
