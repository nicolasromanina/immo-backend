import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamRole extends Document {
  promoteur: mongoose.Types.ObjectId;
  name: string; // 'commercial', 'technique', 'admin', or custom
  description?: string;
  
  permissions: {
    // Leads management
    viewLeads: boolean;
    editLeads: boolean;
    assignLeads: boolean;
    deleteLeads: boolean;
    exportLeads: boolean;
    
    // Projects
    viewProjects: boolean;
    editProjects: boolean;
    createProjects: boolean;
    deleteProjects: boolean;
    
    // Team
    viewTeam: boolean;
    editTeam: boolean;
    addTeamMembers: boolean;
    removeTeamMembers: boolean;
    changeRoles: boolean;
    
    // Reporting & Analytics
    viewReports: boolean;
    viewAnalytics: boolean;
    exportReports: boolean;
    
    // Settings
    editSettings: boolean;
    viewAuditLogs: boolean;
    manageBilling: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const TeamRoleSchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String },
  
  permissions: {
    viewLeads: { type: Boolean, default: true },
    editLeads: { type: Boolean, default: true },
    assignLeads: { type: Boolean, default: false },
    deleteLeads: { type: Boolean, default: false },
    exportLeads: { type: Boolean, default: false },
    
    viewProjects: { type: Boolean, default: true },
    editProjects: { type: Boolean, default: false },
    createProjects: { type: Boolean, default: false },
    deleteProjects: { type: Boolean, default: false },
    
    viewTeam: { type: Boolean, default: true },
    editTeam: { type: Boolean, default: false },
    addTeamMembers: { type: Boolean, default: false },
    removeTeamMembers: { type: Boolean, default: false },
    changeRoles: { type: Boolean, default: false },
    
    viewReports: { type: Boolean, default: true },
    viewAnalytics: { type: Boolean, default: false },
    exportReports: { type: Boolean, default: false },
    
    editSettings: { type: Boolean, default: false },
    viewAuditLogs: { type: Boolean, default: false },
    manageBilling: { type: Boolean, default: false },
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

TeamRoleSchema.index({ promoteur: 1, name: 1 }, { unique: true });

export default mongoose.model<ITeamRole>('TeamRole', TeamRoleSchema);
