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
const AlertSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        enum: ['new-project', 'update-published', 'status-change', 'price-change', 'similar-project', 'deadline-approaching'],
        required: true,
        index: true
    },
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', index: true },
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', index: true },
    criteria: {
        countries: [{ type: String }],
        cities: [{ type: String }],
        projectTypes: [{ type: String, enum: ['villa', 'immeuble'] }],
        budgetMin: { type: Number },
        budgetMax: { type: Number },
        minTrustScore: { type: Number },
        verifiedOnly: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true, index: true },
    frequency: {
        type: String,
        enum: ['instant', 'daily', 'weekly'],
        default: 'instant'
    },
    channels: [{
            type: String,
            enum: ['email', 'whatsapp', 'sms', 'push'],
            default: ['email']
        }],
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    sentAt: { type: Date },
    readAt: { type: Date },
    isRead: { type: Boolean, default: false },
    triggerCount: { type: Number, default: 0 },
    lastTriggeredAt: { type: Date },
}, { timestamps: true });
AlertSchema.index({ user: 1, isActive: 1 });
AlertSchema.index({ user: 1, isRead: 1 });
AlertSchema.index({ type: 1, isActive: 1 });
exports.default = mongoose_1.default.model('Alert', AlertSchema);
