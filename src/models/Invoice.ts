import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  promoteur: mongoose.Types.ObjectId;
  subscription?: mongoose.Types.ObjectId;
  
  // Invoice details
  invoiceNumber: string;
  type: 'subscription' | 'onboarding' | 'addon' | 'custom';
  
  // Amounts
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  currency: string;
  
  // Line items
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  
  // Status
  status: 'draft' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  
  // Dates
  issuedAt: Date;
  dueDate: Date;
  paidAt?: Date;
  
  // Payment
  paymentMethod?: string;
  paymentIntentId?: string;
  stripeInvoiceId?: string;
  
  // Billing info
  billingInfo: {
    name: string;
    email: string;
    address?: string;
    city?: string;
    country?: string;
    taxId?: string;
  };
  
  // Reminders
  remindersSent: Array<{
    type: 'first' | 'second' | 'final';
    sentAt: Date;
  }>;
  
  // PDF
  pdfUrl?: string;
  
  // Notes
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema: Schema = new Schema({
  promoteur: { type: Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
  subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', index: true },
  
  invoiceNumber: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['subscription', 'onboarding', 'addon', 'custom'],
    required: true
  },
  
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  total: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  
  lineItems: [{
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
  }],
  
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'paid', 'failed', 'cancelled', 'refunded'],
    default: 'draft',
    index: true
  },
  
  issuedAt: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  paidAt: { type: Date },
  
  paymentMethod: { type: String },
  paymentIntentId: { type: String },
  stripeInvoiceId: { type: String },
  
  billingInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    taxId: { type: String },
  },
  
  remindersSent: [{
    type: { type: String, enum: ['first', 'second', 'final'], required: true },
    sentAt: { type: Date, default: Date.now },
  }],
  
  pdfUrl: { type: String },
  notes: { type: String },
}, { timestamps: true });

InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ invoiceNumber: 1 });

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
