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
const crisisAlertSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['reputational', 'legal', 'financial', 'operational', 'media'],
        required: true,
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true,
    },
    status: {
        type: String,
        enum: ['detected', 'investigating', 'responding', 'resolved', 'escalated'],
        default: 'detected',
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    affectedEntities: {
        promoteurs: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur' }],
        projects: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Project' }],
        regions: [String],
    },
    source: { type: String, required: true },
    detectedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    communications: [{
            channel: { type: String, enum: ['email', 'whatsapp', 'sms', 'in-app', 'phone'] },
            sentAt: { type: Date, default: Date.now },
            recipients: String,
            message: String,
            sentBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        }],
    actions: [{
            action: String,
            performedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
            performedAt: { type: Date, default: Date.now },
            notes: String,
        }],
    resolution: {
        resolvedAt: Date,
        resolvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        summary: String,
    },
}, { timestamps: true });
crisisAlertSchema.index({ status: 1, severity: 1 });
crisisAlertSchema.index({ type: 1, status: 1 });
exports.default = mongoose_1.default.model('CrisisAlert', crisisAlertSchema);
