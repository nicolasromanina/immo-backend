import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminGeoAssignment extends Document {
  admin: mongoose.Types.ObjectId;
  countries: string[];
  cities: string[];
  role: 'ops' | 'moderation' | 'support' | 'sales';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminGeoAssignmentSchema: Schema = new Schema({
  admin: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  countries: [{ type: String, required: true }],
  cities: [{ type: String }],
  role: {
    type: String,
    enum: ['ops', 'moderation', 'support', 'sales'],
    required: true,
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

AdminGeoAssignmentSchema.index({ countries: 1, role: 1 });

export default mongoose.model<IAdminGeoAssignment>('AdminGeoAssignment', AdminGeoAssignmentSchema);
