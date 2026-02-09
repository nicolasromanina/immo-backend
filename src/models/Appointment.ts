import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  promoteur: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  lead: mongoose.Types.ObjectId;
  scheduledAt: Date;
  durationMinutes: number;
  type: 'visio' | 'physique' | 'phone';
  status: 'requested' | 'confirmed' | 'canceled' | 'completed';
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
}

const AppointmentSchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  scheduledAt: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, default: 30 },
  type: { type: String, enum: ['visio', 'physique', 'phone'], required: true },
  status: { type: String, enum: ['requested', 'confirmed', 'canceled', 'completed'], default: 'requested' },
  notes: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

AppointmentSchema.index({ promoteur: 1, scheduledAt: 1 });
AppointmentSchema.index({ lead: 1, scheduledAt: 1 });

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);
