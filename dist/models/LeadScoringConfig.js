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
const LeadScoringConfigSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: false },
    scoreRanges: {
        A: { min: { type: Number, default: 80 }, max: { type: Number, default: 100 } },
        B: { min: { type: Number, default: 60 }, max: { type: Number, default: 79 } },
        C: { min: { type: Number, default: 40 }, max: { type: Number, default: 59 } },
        D: { min: { type: Number, default: 0 }, max: { type: Number, default: 39 } },
    },
    weights: {
        budgetMatch: { type: Number, default: 25 },
        timelineMatch: { type: Number, default: 20 },
        financingType: { type: Number, default: 20 },
        profileCompleteness: { type: Number, default: 15 },
        engagement: { type: Number, default: 10 },
        source: { type: Number, default: 10 },
    },
    budgetScoring: {
        exactMatch: { type: Number, default: 100 },
        within10Percent: { type: Number, default: 80 },
        within25Percent: { type: Number, default: 50 },
        over25Percent: { type: Number, default: 20 },
    },
    timelineScoring: {
        immediate: { type: Number, default: 100 },
        threeMonths: { type: Number, default: 80 },
        sixMonths: { type: Number, default: 60 },
        oneYear: { type: Number, default: 40 },
        flexible: { type: Number, default: 30 },
    },
    financingScoring: {
        cash: { type: Number, default: 100 },
        mortgage: { type: Number, default: 70 },
        mixed: { type: Number, default: 80 },
        unknown: { type: Number, default: 30 },
    },
    sourceScoring: {
        website: { type: Number, default: 60 },
        whatsapp: { type: Number, default: 70 },
        referral: { type: Number, default: 100 },
        direct: { type: Number, default: 80 },
        other: { type: Number, default: 40 },
    },
    slaThresholds: {
        scoreA: { type: Number, default: 2 },
        scoreB: { type: Number, default: 8 },
        scoreC: { type: Number, default: 24 },
        scoreD: { type: Number, default: 48 },
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
exports.default = mongoose_1.default.model('LeadScoringConfig', LeadScoringConfigSchema);
