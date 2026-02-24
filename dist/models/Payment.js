"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const PaymentSchema = new mongoose_1.Schema({
    promoteur: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    subscription: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Subscription' },
    boostDetails: {
        projectId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project' },
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
    metadata: { type: Map, of: mongoose_1.Schema.Types.Mixed }
}, {
    timestamps: true
});
// Index pour recherche rapide
PaymentSchema.index({ promoteur: 1, status: 1 });
PaymentSchema.index({ type: 1, approvalStatus: 1 }); // Pour los boosts en attente d'approbation
PaymentSchema.index({ type: 1, status: 1 });
PaymentSchema.index({ stripePaymentIntentId: 1 });
PaymentSchema.index({ createdAt: -1 });
exports.default = mongoose_1.default.model('Payment', PaymentSchema);
