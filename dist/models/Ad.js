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
const adSchema = new mongoose_1.Schema({
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', required: true },
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
        type: String,
        enum: ['banner', 'spotlight', 'sponsored-listing', 'push-notification', 'email-blast'],
        required: true,
    },
    status: {
        type: String,
        enum: ['draft', 'pending-review', 'active', 'paused', 'rejected', 'completed', 'expired'],
        default: 'draft',
    },
    targeting: {
        cities: [String],
        countries: [String],
        priceRange: {
            min: Number,
            max: Number,
        },
        projectTypes: [String],
        audienceType: [{ type: String, enum: ['visitors', 'registered', 'active-leads'] }],
    },
    budget: {
        totalBudget: { type: Number, required: true },
        dailyBudget: Number,
        spent: { type: Number, default: 0 },
        currency: { type: String, default: 'EUR' },
    },
    schedule: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
    },
    creative: {
        imageUrl: String,
        linkUrl: String,
        callToAction: { type: String, default: 'En savoir plus' },
    },
    metrics: {
        impressions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        conversions: { type: Number, default: 0 },
        ctr: { type: Number, default: 0 },
    },
    dailyStats: [{
            date: { type: Date, required: true },
            impressions: { type: Number, default: 0 },
            clicks: { type: Number, default: 0 },
            spent: { type: Number, default: 0 },
        }],
    rejectionReason: String,
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
adSchema.index({ promoteur: 1, status: 1 });
adSchema.index({ status: 1, 'schedule.startDate': 1, 'schedule.endDate': 1 });
adSchema.index({ type: 1, status: 1 });
exports.default = mongoose_1.default.model('Ad', adSchema);
