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
const PromoteurSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    organizationName: { type: String, required: true, trim: true },
    organizationType: {
        type: String,
        enum: ['individual', 'small', 'established', 'enterprise'],
        default: 'small'
    },
    plan: {
        type: String,
        enum: ['starter', 'publie', 'verifie', 'partenaire', 'enterprise'],
        default: 'starter'
    },
    isFoundingPartner: { type: Boolean, default: false },
    foundingPartnerDiscount: { type: Number, default: 0, min: 0, max: 100 },
    foundingPartnerExpiresAt: { type: Date },
    isLegacyPlan: { type: Boolean, default: false },
    subscriptionStatus: {
        type: String,
        enum: ['trial', 'active', 'expired', 'suspended'],
        default: 'trial'
    },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    trialEndsAt: { type: Date },
    kycStatus: {
        type: String,
        enum: ['pending', 'submitted', 'verified', 'rejected'],
        default: 'pending'
    },
    kycDocuments: [{
            type: { type: String, required: true },
            url: { type: String, required: true },
            status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
            uploadedAt: { type: Date, default: Date.now },
            rejectionReason: { type: String, default: '' },
        }],
    agrementNumber: { type: String },
    hasAgrement: { type: Boolean, default: false },
    companyDocuments: [{
            type: { type: String, required: true },
            url: { type: String, required: true },
            name: { type: String, required: true },
            status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
            uploadedAt: { type: Date, default: Date.now },
            reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
            reviewedAt: { type: Date },
            rejectionReason: { type: String, default: '' },
        }],
    onboardingCompleted: { type: Boolean, default: false },
    onboardingProgress: { type: Number, default: 0, min: 0, max: 100 },
    onboardingChecklist: [{
            code: { type: String, trim: true },
            item: { type: String, required: true },
            completed: { type: Boolean, default: false },
            completedAt: { type: Date },
        }],
    complianceStatus: {
        type: String,
        enum: ['publie', 'conforme', 'verifie'],
        default: 'publie',
        index: true,
    },
    complianceRequest: {
        requestedStatus: { type: String, enum: ['conforme', 'verifie'] },
        status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'] },
        requestedAt: { type: Date },
        reviewedAt: { type: Date },
        reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
    },
    financialProofLevel: {
        type: String,
        enum: ['none', 'basic', 'medium', 'high'],
        default: 'none'
    },
    financialProofDocuments: [{
            url: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now },
            status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
            reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
            reviewedAt: { type: Date },
            rejectionReason: { type: String, default: '' },
        }],
    trustScore: { type: Number, default: 0, min: 0, max: 100 },
    badges: [{
            badgeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Badge', required: true },
            earnedAt: { type: Date, default: Date.now },
            expiresAt: { type: Date },
        }],
    companyAddress: { type: String },
    companyPhone: { type: String },
    companyEmail: { type: String },
    website: { type: String },
    description: { type: String },
    logo: { type: String },
    teamMembers: [{
            userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            role: { type: String, enum: ['commercial', 'technique', 'admin'], required: true },
            addedAt: { type: Date, default: Date.now },
        }],
    totalProjects: { type: Number, default: 0 },
    activeProjects: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    totalLeadsReceived: { type: Number, default: 0 },
    averageResponseTime: { type: Number },
    restrictions: [{
            type: { type: String, required: true },
            reason: { type: String, required: true },
            appliedAt: { type: Date, default: Date.now },
            expiresAt: { type: Date },
        }],
    stripeCustomerId: { type: String, unique: true, sparse: true },
    paymentHistory: [{
            amount: { type: Number, required: true },
            type: { type: String, enum: ['subscription', 'onboarding', 'addon', 'upgrade'], required: true },
            status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
            date: { type: Date, default: Date.now },
        }],
    planChangeRequest: {
        requestedPlan: { type: String, enum: ['starter', 'publie', 'verifie', 'partenaire', 'enterprise', null] },
        requestType: { type: String, enum: ['upgrade', 'downgrade', 'cancel'] },
        requestedAt: { type: Date, default: Date.now },
        effectiveDate: { type: Date },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        reason: { type: String },
    },
}, { timestamps: true });
PromoteurSchema.index({ user: 1 });
PromoteurSchema.index({ plan: 1, subscriptionStatus: 1 });
PromoteurSchema.index({ trustScore: -1 });
PromoteurSchema.index({ kycStatus: 1 });
exports.default = mongoose_1.default.model('Promoteur', PromoteurSchema);
