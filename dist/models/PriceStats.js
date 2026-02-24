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
const PriceStatsSchema = new mongoose_1.Schema({
    country: { type: String, required: true, index: true },
    city: { type: String, required: true, index: true },
    area: { type: String, required: true, index: true },
    projectType: {
        type: String,
        enum: ['villa', 'immeuble'],
        required: true,
        index: true
    },
    pricePerSqm: {
        min: { type: Number, required: true },
        max: { type: Number, required: true },
        average: { type: Number, required: true },
        median: { type: Number, required: true },
    },
    sampleSize: { type: Number, required: true, min: 0 },
    projectIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Project' }],
    typologyStats: [{
            name: { type: String, required: true },
            minPrice: { type: Number, required: true },
            maxPrice: { type: Number, required: true },
            avgPrice: { type: Number, required: true },
            avgSurface: { type: Number, required: true },
            avgPricePerSqm: { type: Number, required: true },
            count: { type: Number, required: true },
        }],
    trend: {
        direction: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
        percentageChange: { type: Number, default: 0 },
        lastCalculated: { type: Date, default: Date.now },
    },
    history: [{
            date: { type: Date, required: true },
            avgPricePerSqm: { type: Number, required: true },
            sampleSize: { type: Number, required: true },
        }],
    lastUpdated: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
// Compound index for location + type lookups
PriceStatsSchema.index({ country: 1, city: 1, area: 1, projectType: 1 }, { unique: true });
PriceStatsSchema.index({ 'pricePerSqm.average': 1 });
exports.default = mongoose_1.default.model('PriceStats', PriceStatsSchema);
