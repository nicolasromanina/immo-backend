import mongoose, { Schema, Document } from 'mongoose';

export interface IAvailability extends Document {
  promoteur: mongoose.Types.ObjectId;
  timezone: string;
  isActive: boolean;
  weeklySlots: Array<{
    dayOfWeek: number; // 0-6
    slots: Array<{
      start: string; // HH:mm
      end: string; // HH:mm
    }>;
  }>;
  weeklySchedule: Array<{
    day: string;
    isAvailable: boolean;
    slots: Array<{
      startTime: string;
      endTime: string;
    }>;
  }>;
  blackoutDates: Date[];
  blockedDates: Array<{
    startDate: Date;
    endDate: Date;
    reason?: string;
  }>;
}

const AvailabilitySchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, unique: true },
  timezone: { type: String, default: 'UTC' },
  isActive: { type: Boolean, default: true },
  weeklySlots: [{
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    slots: [{
      start: { type: String, required: true },
      end: { type: String, required: true },
    }],
  }],
  weeklySchedule: [{
    day: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    slots: [{
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
    }],
  }],
  blackoutDates: [{ type: Date }],
  blockedDates: [{
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String },
  }],
}, { timestamps: true });

export default mongoose.model<IAvailability>('Availability', AvailabilitySchema);
