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
const CaseSchema = new mongoose_1.Schema({
    caseNumber: { type: String, required: true, unique: true },
    type: {
        type: String,
        enum: ['litige', 'doute', 'signalement', 'plainte', 'enquete'],
        required: true,
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    reporter: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reporterType: {
        type: String,
        enum: ['client', 'promoteur', 'admin', 'system'],
        required: true
    },
    subject: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    subjectType: {
        type: String,
        enum: ['promoteur', 'project', 'update', 'document', 'lead'],
        required: true
    },
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['fraude', 'contenu-suspect', 'retard-injustifie', 'non-reponse', 'info-incorrecte', 'autre'],
        required: true,
        index: true
    },
    evidence: [{
            type: { type: String, enum: ['screenshot', 'document', 'url', 'text', 'other'], required: true },
            url: { type: String },
            description: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now },
        }],
    status: {
        type: String,
        enum: ['nouveau', 'en-cours', 'attente-info', 'resolu', 'ferme', 'escalade'],
        default: 'nouveau',
        index: true
    },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedTeam: { type: String },
    reportedAt: { type: Date, default: Date.now },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    slaDeadline: { type: Date, required: true },
    slaBreached: { type: Boolean, default: false },
    investigationNotes: [{
            note: { type: String, required: true },
            addedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            addedAt: { type: Date, default: Date.now },
            isInternal: { type: Boolean, default: true },
            attachments: [{ type: String }],
        }],
    communications: [{
            from: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            to: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            message: { type: String, required: true },
            sentAt: { type: Date, default: Date.now },
            isInternal: { type: Boolean, default: false },
        }],
    resolution: {
        outcome: { type: String, enum: ['valid', 'invalid', 'partially-valid', 'dismissed'] },
        explanation: { type: String },
        actionTaken: { type: String },
        resolvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        resolvedAt: { type: Date },
    },
    actions: [{
            type: { type: String, enum: ['warning', 'restriction', 'suspension', 'content-removal', 'other'], required: true },
            description: { type: String, required: true },
            appliedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            appliedAt: { type: Date, default: Date.now },
            targetId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
        }],
    relatedCases: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Case' }],
    reporterFeedback: {
        satisfied: { type: Boolean },
        comment: { type: String },
        submittedAt: { type: Date },
    },
}, { timestamps: true });
CaseSchema.index({ caseNumber: 1 });
CaseSchema.index({ status: 1, priority: 1 });
CaseSchema.index({ assignedTo: 1, status: 1 });
CaseSchema.index({ type: 1, category: 1 });
// Indexes to support SLA/time-range queries and aggregations
CaseSchema.index({ reportedAt: 1 });
CaseSchema.index({ firstResponseAt: 1 });
CaseSchema.index({ slaDeadline: 1 });
CaseSchema.index({ slaBreached: 1 });
// Auto-generate case number
CaseSchema.pre('save', async function (next) {
    if (!this.caseNumber) {
        const count = await mongoose_1.default.model('Case').countDocuments();
        this.caseNumber = `CASE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
    }
    next();
});
exports.default = mongoose_1.default.model('Case', CaseSchema);
