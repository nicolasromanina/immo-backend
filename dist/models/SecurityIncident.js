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
const SecurityIncidentSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ['data_breach', 'unauthorized_access', 'fraud', 'phishing', 'ddos', 'malware', 'other'],
        required: true,
        index: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true,
        index: true
    },
    description: { type: String, required: true },
    status: {
        type: String,
        enum: ['detected', 'investigating', 'contained', 'resolved', 'closed'],
        default: 'detected',
        index: true
    },
    affectedUsers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    affectedPromoteurs: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur' }],
    affectedProjects: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Project' }],
    detectedAt: { type: Date, required: true, default: Date.now },
    containedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    responseActions: [{
            action: { type: String, required: true },
            performedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            performedAt: { type: Date, default: Date.now },
            notes: { type: String },
        }],
    investigationNotes: [{
            note: { type: String, required: true },
            addedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            addedAt: { type: Date, default: Date.now },
        }],
    rootCause: { type: String },
    notificationsSent: [{
            type: { type: String, enum: ['email', 'sms', 'inApp'], required: true },
            recipientType: { type: String, enum: ['affected_users', 'all_users', 'admins', 'regulators'], required: true },
            sentAt: { type: Date, default: Date.now },
            content: { type: String, required: true },
        }],
    regulatoryReportRequired: { type: Boolean, default: false },
    regulatoryReportSubmittedAt: { type: Date },
    regulatoryReportRef: { type: String },
    assignedTo: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    leadInvestigator: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
SecurityIncidentSchema.index({ status: 1, severity: 1 });
exports.default = mongoose_1.default.model('SecurityIncident', SecurityIncidentSchema);
