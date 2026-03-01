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
const LeadSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
    client: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    budget: { type: Number, required: true },
    financingType: {
        type: String,
        enum: ['cash', 'mortgage', 'mixed', 'unknown'],
        default: 'unknown'
    },
    timeframe: {
        type: String,
        enum: ['immediate', '3-months', '6-months', '1-year', 'flexible'],
        required: true
    },
    interestedTypology: { type: String },
    score: {
        type: String,
        enum: ['A', 'B', 'C', 'D'],
        required: true,
        index: true
    },
    scoreDetails: {
        budgetMatch: { type: Number, min: 0, max: 100 },
        timelineMatch: { type: Number, min: 0, max: 100 },
        engagementLevel: { type: Number, min: 0, max: 100 },
        profileCompleteness: { type: Number, min: 0, max: 100 },
    },
    status: {
        type: String,
        enum: ['nouveau', 'contacte', 'rdv-planifie', 'visite-effectuee', 'proposition-envoyee', 'negocie', 'gagne', 'perdu'],
        default: 'nouveau',
        index: true
    },
    pipeline: [{
            status: { type: String, required: true },
            changedAt: { type: Date, default: Date.now },
            changedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            notes: { type: String },
        }],
    contactMethod: {
        type: String,
        enum: ['email', 'whatsapp', 'phone', 'rdv'],
        required: true
    },
    lastContactDate: { type: Date },
    nextFollowUpDate: { type: Date, index: true },
    meetingScheduled: {
        date: { type: Date },
        type: { type: String, enum: ['visio', 'physique', 'phone'] },
        notes: { type: String },
        calendarLink: { type: String },
    },
    initialMessage: { type: String, required: true },
    notes: [{
            content: { type: String, required: true },
            addedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            addedAt: { type: Date, default: Date.now },
            isPrivate: { type: Boolean, default: false },
        }],
    documentsSent: [{
            documentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Document', required: true },
            sentAt: { type: Date, default: Date.now },
            viewed: { type: Boolean, default: false },
        }],
    responseTime: { type: Number },
    responseSLA: { type: Boolean, default: true, index: true },
    source: {
        type: String,
        enum: ['contact-form', 'document-access-request', 'brochure-request', 'appointment-request', 'website', 'whatsapp', 'referral', 'direct', 'other'],
        default: 'other'
    },
    referralCode: { type: String },
    tags: {
        type: [String],
        default: ['not-contacted'],
        index: true,
    },
    firstContactDate: { type: Date },
    notContactedReminderSent: { type: Date },
    isSerious: { type: Boolean, default: true },
    flaggedAsNotSerious: { type: Boolean, default: false },
    flagReason: { type: String },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    converted: { type: Boolean, default: false, index: true },
    conversionDate: { type: Date },
    conversionValue: { type: Number },
    lostReason: { type: String },
}, { timestamps: true });
LeadSchema.index({ promoteur: 1, status: 1, score: 1 });
LeadSchema.index({ project: 1, status: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ email: 1 });
LeadSchema.index({ tags: 1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ promoteur: 1, tags: 1 }); // For filtering leads by promoteur and tags
LeadSchema.index({ createdAt: 1, tags: 1, notContactedReminderSent: 1 }); // For 2-day reminder job
exports.default = mongoose_1.default.model('Lead', LeadSchema);
