import mongoose, { Schema, Document } from 'mongoose';

/**
 * Travel Plan for diaspora clients
 * Allows clients to plan site visits, meetings, and itineraries during trips
 */

export interface ITravelVisit {
  project: mongoose.Types.ObjectId;
  promoteur: mongoose.Types.ObjectId;
  scheduledDate: Date;
  scheduledTime: string; // "10:00", "14:30"
  duration: number; // in minutes
  type: 'site-visit' | 'meeting' | 'virtual-tour';
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  // Contact info for the visit
  contactPerson?: string;
  contactPhone?: string;
  meetingPoint?: string;
  // Confirmation details
  confirmedAt?: Date;
  confirmedBy?: mongoose.Types.ObjectId;
  // Completion details
  completedAt?: Date;
  feedback?: {
    rating: number; // 1-5
    comment?: string;
    wouldRecommend: boolean;
  };
}

export interface ITravelPlan extends Document {
  user: mongoose.Types.ObjectId;
  
  // Trip info
  tripName: string;
  destination: {
    country: string;
    city: string;
    areas?: string[]; // Specific areas to visit
  };
  
  // Trip dates
  arrivalDate: Date;
  departureDate: Date;
  
  // Accommodation (optional)
  accommodation?: {
    name?: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Planned visits
  visits: ITravelVisit[];
  
  // Itinerary optimization
  optimizedItinerary?: Array<{
    date: Date;
    visits: Array<{
      visitIndex: number;
      startTime: string;
      endTime: string;
      travelTimeFromPrevious?: number; // in minutes
    }>;
  }>;
  
  // Status
  status: 'planning' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  
  // Preferences
  preferences: {
    preferredVisitDuration: number; // default visit duration in minutes
    preferredStartTime: string; // e.g., "09:00"
    preferredEndTime: string; // e.g., "18:00"
    breakDuration: number; // lunch break in minutes
    maxVisitsPerDay: number;
    requiresTranslator: boolean;
    transportMode: 'car' | 'public' | 'walking';
  };
  
  // Shared with
  sharedWith: Array<{
    email: string;
    name?: string;
    sharedAt: Date;
  }>;
  
  // Share token for public link
  shareToken?: string;
  
  // Notes
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const TravelVisitSchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true },
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },
  duration: { type: Number, default: 60 },
  type: { 
    type: String, 
    enum: ['site-visit', 'meeting', 'virtual-tour'],
    default: 'site-visit'
  },
  status: { 
    type: String, 
    enum: ['requested', 'confirmed', 'cancelled', 'completed'],
    default: 'requested'
  },
  notes: { type: String },
  contactPerson: { type: String },
  contactPhone: { type: String },
  meetingPoint: { type: String },
  confirmedAt: { type: Date },
  confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    wouldRecommend: { type: Boolean },
  },
});

const TravelPlanSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  tripName: { type: String, required: true, trim: true },
  destination: {
    country: { type: String, required: true },
    city: { type: String, required: true },
    areas: [{ type: String }],
  },
  
  arrivalDate: { type: Date, required: true, index: true },
  departureDate: { type: Date, required: true },
  
  accommodation: {
    name: { type: String },
    address: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  
  visits: [TravelVisitSchema],
  
  optimizedItinerary: [{
    date: { type: Date },
    visits: [{
      visitIndex: { type: Number },
      startTime: { type: String },
      endTime: { type: String },
      travelTimeFromPrevious: { type: Number },
    }],
  }],
  
  status: { 
    type: String, 
    enum: ['planning', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'planning',
    index: true
  },
  
  preferences: {
    preferredVisitDuration: { type: Number, default: 60 },
    preferredStartTime: { type: String, default: '09:00' },
    preferredEndTime: { type: String, default: '18:00' },
    breakDuration: { type: Number, default: 60 },
    maxVisitsPerDay: { type: Number, default: 4 },
    requiresTranslator: { type: Boolean, default: false },
    transportMode: { 
      type: String, 
      enum: ['car', 'public', 'walking'],
      default: 'car'
    },
  },
  
  sharedWith: [{
    email: { type: String, required: true },
    name: { type: String },
    sharedAt: { type: Date, default: Date.now },
  }],
  
  shareToken: { type: String, unique: true, sparse: true },
  
  notes: { type: String },
}, { timestamps: true });

// Indexes
TravelPlanSchema.index({ user: 1, status: 1 });
TravelPlanSchema.index({ 'destination.country': 1, 'destination.city': 1 });
TravelPlanSchema.index({ arrivalDate: 1, departureDate: 1 });
TravelPlanSchema.index({ shareToken: 1 });

export default mongoose.model<ITravelPlan>('TravelPlan', TravelPlanSchema);
