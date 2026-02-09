import mongoose, { Schema, Document } from 'mongoose';

/**
 * Price Statistics model for tracking price per m² by area
 * Used for the price comparator feature
 */

export interface IPriceStats extends Document {
  // Location
  country: string;
  city: string;
  area: string;

  // Project type
  projectType: 'villa' | 'immeuble';

  // Price statistics (per m²)
  pricePerSqm: {
    min: number;
    max: number;
    average: number;
    median: number;
  };

  // Sample data
  sampleSize: number; // Number of projects used for calculation
  projectIds: mongoose.Types.ObjectId[];

  // Typology breakdown
  typologyStats: Array<{
    name: string; // e.g., "F2", "F3", "F4"
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    avgSurface: number;
    avgPricePerSqm: number;
    count: number;
  }>;

  // Trend data
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentageChange: number; // compared to last period
    lastCalculated: Date;
  };

  // Historical data (for trend analysis)
  history: Array<{
    date: Date;
    avgPricePerSqm: number;
    sampleSize: number;
  }>;

  // Metadata
  lastUpdated: Date;
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const PriceStatsSchema: Schema = new Schema({
  country: { type: String, required: true, index: true },
  city: { type: String, required: true, index: true },
  area: { type: String, required: true, index: true },

  projectType: { 
    type: String, 
    enum: ['villa', 'immeuble'],
    required: true,
    index: true
  },

  pricePerSqm: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    average: { type: Number, required: true },
    median: { type: Number, required: true },
  },

  sampleSize: { type: Number, required: true, min: 0 },
  projectIds: [{ type: Schema.Types.ObjectId, ref: 'Project' }],

  typologyStats: [{
    name: { type: String, required: true },
    minPrice: { type: Number, required: true },
    maxPrice: { type: Number, required: true },
    avgPrice: { type: Number, required: true },
    avgSurface: { type: Number, required: true },
    avgPricePerSqm: { type: Number, required: true },
    count: { type: Number, required: true },
  }],

  trend: {
    direction: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
    percentageChange: { type: Number, default: 0 },
    lastCalculated: { type: Date, default: Date.now },
  },

  history: [{
    date: { type: Date, required: true },
    avgPricePerSqm: { type: Number, required: true },
    sampleSize: { type: Number, required: true },
  }],

  lastUpdated: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Compound index for location + type lookups
PriceStatsSchema.index({ country: 1, city: 1, area: 1, projectType: 1 }, { unique: true });
PriceStatsSchema.index({ 'pricePerSqm.average': 1 });

export default mongoose.model<IPriceStats>('PriceStats', PriceStatsSchema);
