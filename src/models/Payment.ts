import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  promoteur: mongoose.Types.ObjectId;
  amount: number; // En centimes
  currency: string;
  type: 'subscription' | 'boost' | 'onboarding' | 'addon' | 'upgrade';
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // Pour les boosts uniquement
  
  // Stripe IDs
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  
  // Détails selon le type
  subscription?: mongoose.Types.ObjectId;
  boostDetails?: {
    projectId?: mongoose.Types.ObjectId;
    boostType: 'basic' | 'premium' | 'enterprise' | 'custom';
    duration: number; // Durée en jours
    startDate: Date;
    endDate: Date;
  };
  
  // Informations de paiement
  paymentMethod?: string;
  receiptUrl?: string;
  errorMessage?: string;
  refundedAmount?: number;
  
  // Metadata
  metadata?: Record<string, any>;
}

const PaymentSchema: Schema = new Schema({
  promoteur: { 
    type: Schema.Types.ObjectId, 
    ref: 'Promoteur', 
    required: true,
    index: true
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'eur' },
  type: { 
    type: String, 
    enum: ['subscription', 'boost', 'onboarding', 'addon', 'upgrade'],
    required: true
  },
  status: { 
    type: String, 
    enum: ['pending', 'succeeded', 'failed', 'canceled', 'refunded'],
    default: 'pending'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending' // Par défaut, les nouveaux boosts sont en attente d'approbation
  },
  
  stripePaymentIntentId: { type: String, unique: true, sparse: true },
  stripeChargeId: { type: String },
  
  subscription: { type: Schema.Types.ObjectId, ref: 'Subscription' },
  boostDetails: {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    boostType: { 
      type: String, 
      enum: ['basic', 'premium', 'enterprise', 'custom']
    },
    duration: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date }
  },
  
  paymentMethod: { type: String },
  receiptUrl: { type: String },
  errorMessage: { type: String },
  refundedAmount: { type: Number, default: 0 },
  
  metadata: { type: Map, of: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Index pour recherche rapide
PaymentSchema.index({ promoteur: 1, status: 1 });
PaymentSchema.index({ type: 1, approvalStatus: 1 }); // Pour los boosts en attente d'approbation
PaymentSchema.index({ type: 1, status: 1 });
PaymentSchema.index({ stripePaymentIntentId: 1 });
PaymentSchema.index({ createdAt: -1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
