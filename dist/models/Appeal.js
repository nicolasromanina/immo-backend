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
const AppealSchema = new mongoose_1.Schema({
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', index: true },
    type: {
        type: String,
        enum: ['suspension', 'restriction', 'rejection', 'badge-removal', 'score-penalty', 'other'],
        required: true,
        index: true
    },
    reason: { type: String, required: true },
    description: { type: String, required: true },
    originalAction: {
        type: { type: String, required: true },
        appliedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
        appliedAt: { type: Date, required: true },
        reason: { type: String, required: true },
    },
    evidence: [{
            type: { type: String, enum: ['document', 'screenshot', 'explanation', 'other'], required: true },
            url: { type: String },
            description: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now },
        }],
    mitigationPlan: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'under-review', 'escalated', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    level: { type: Number, enum: [1, 2], default: 1 },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    submittedAt: { type: Date, default: Date.now },
    reviewStartedAt: { type: Date },
    resolvedAt: { type: Date },
    deadline: { type: Date, required: true, index: true },
    reviewNotes: [{
            note: { type: String, required: true },
            addedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            addedAt: { type: Date, default: Date.now },
            isInternal: { type: Boolean, default: false },
        }],
    decision: {
        outcome: { type: String, enum: ['approved', 'partially-approved', 'rejected'] },
        explanation: { type: String },
        decidedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        decidedAt: { type: Date },
        newAction: {
            type: { type: String },
            details: { type: String },
        },
    },
    escalated: { type: Boolean, default: false },
    escalationReason: { type: String },
    escalatedAt: { type: Date },
    escalatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
AppealSchema.index({ promoteur: 1, status: 1 });
AppealSchema.index({ status: 1, deadline: 1 });
AppealSchema.index({ assignedTo: 1, status: 1 });
exports.default = mongoose_1.default.model('Appeal', AppealSchema);
