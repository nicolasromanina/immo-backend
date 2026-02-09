import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  promoteur: mongoose.Types.ObjectId;
  plan: 'basique' | 'standard' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  
  // Stripe IDs
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  
  // Dates
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  cancelAt?: Date;
  
  // Metadata
  metadata?: Record<string, any>;

  // Billing reminders
  billingReminders?: {
    sevenDaysAt?: Date;
    oneDayAt?: Date;
    pastDueAt?: Date;
  };
}

const SubscriptionSchema: Schema = new Schema({
  promoteur: { 
    type: Schema.Types.ObjectId, 
    ref: 'Promoteur', 
    required: true,
    index: true
  },
  plan: { 
    type: String, 
    enum: ['basique', 'standard', 'premium'],
    required: true
  },
  status: { 
    type: String, 
    enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing'],
    default: 'incomplete'
  },
  
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String, unique: true, sparse: true },
  stripePriceId: { type: String },
  
  currentPeriodStart: { type: Date, required: true },
  currentPeriodEnd: { type: Date, required: true },
  canceledAt: { type: Date },
  cancelAt: { type: Date },
  
  metadata: { type: Map, of: Schema.Types.Mixed }
  ,
  billingReminders: {
    sevenDaysAt: { type: Date },
    oneDayAt: { type: Date },
    pastDueAt: { type: Date },
  }
}, {
  timestamps: true
});

// Index pour recherche rapide
SubscriptionSchema.index({ promoteur: 1, status: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
