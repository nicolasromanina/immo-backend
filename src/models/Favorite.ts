import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite extends Document {
  user: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  
  // Alerts
  alertOnUpdate: boolean;
  alertOnPriceChange: boolean;
  alertOnStatusChange: boolean;
}

const FavoriteSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  notes: { type: String },
  
  alertOnUpdate: { type: Boolean, default: true },
  alertOnPriceChange: { type: Boolean, default: true },
  alertOnStatusChange: { type: Boolean, default: true },
}, { timestamps: true });

FavoriteSchema.index({ user: 1, project: 1 }, { unique: true });

export default mongoose.model<IFavorite>('Favorite', FavoriteSchema);
