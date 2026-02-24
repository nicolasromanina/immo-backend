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
const TrustScoreConfigSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: false },
    weights: {
        kyc: { type: Number, default: 20 },
        documents: { type: Number, default: 15 },
        updates: { type: Number, default: 20 },
        responseTime: { type: Number, default: 15 },
        projectCompletion: { type: Number, default: 15 },
        reviews: { type: Number, default: 10 },
        badges: { type: Number, default: 5 },
    },
    thresholds: {
        villa: {
            publishedMin: { type: Number, default: 0 },
            conformeMin: { type: Number, default: 50 },
            verifieMin: { type: Number, default: 70 },
        },
        immeuble: {
            publishedMin: { type: Number, default: 0 },
            conformeMin: { type: Number, default: 60 },
            verifieMin: { type: Number, default: 80 },
        },
    },
    updateFrequency: {
        minimum: { type: Number, default: 30 },
        ideal: { type: Number, default: 14 },
        maxPenalty: { type: Number, default: 20 },
    },
    responseTimeSLA: {
        excellent: { type: Number, default: 2 },
        good: { type: Number, default: 8 },
        acceptable: { type: Number, default: 24 },
    },
    gamingDetection: {
        minUpdateIntervalHours: { type: Number, default: 4 },
        maxDailyUpdates: { type: Number, default: 5 },
        suspiciousPatternsEnabled: { type: Boolean, default: true },
    },
    bonusPoints: {
        verifiedBadge: { type: Number, default: 5 },
        completeProfile: { type: Number, default: 3 },
        quickResponder: { type: Number, default: 5 },
        consistentUpdater: { type: Number, default: 5 },
    },
    penalties: {
        noUpdatesWeek: { type: Number, default: 5 },
        noUpdatesMonth: { type: Number, default: 15 },
        missedSLA: { type: Number, default: 3 },
        rejectedDocument: { type: Number, default: 5 },
        complaint: { type: Number, default: 10 },
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
exports.default = mongoose_1.default.model('TrustScoreConfig', TrustScoreConfigSchema);
