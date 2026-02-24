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
const TravelVisitSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', required: true },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true },
    duration: { type: Number, default: 60 },
    type: {
        type: String,
        enum: ['site-visit', 'meeting', 'virtual-tour'],
        default: 'site-visit'
    },
    status: {
        type: String,
        enum: ['requested', 'confirmed', 'cancelled', 'completed'],
        default: 'requested'
    },
    notes: { type: String },
    contactPerson: { type: String },
    contactPhone: { type: String },
    meetingPoint: { type: String },
    confirmedAt: { type: Date },
    confirmedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    feedback: {
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        wouldRecommend: { type: Boolean },
    },
});
const TravelPlanSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tripName: { type: String, required: true, trim: true },
    destination: {
        country: { type: String, required: true },
        city: { type: String, required: true },
        areas: [{ type: String }],
    },
    arrivalDate: { type: Date, required: true, index: true },
    departureDate: { type: Date, required: true },
    accommodation: {
        name: { type: String },
        address: { type: String },
        coordinates: {
            lat: { type: Number },
            lng: { type: Number },
        },
    },
    visits: [TravelVisitSchema],
    optimizedItinerary: [{
            date: { type: Date },
            visits: [{
                    visitIndex: { type: Number },
                    startTime: { type: String },
                    endTime: { type: String },
                    travelTimeFromPrevious: { type: Number },
                }],
        }],
    status: {
        type: String,
        enum: ['planning', 'confirmed', 'in-progress', 'completed', 'cancelled'],
        default: 'planning',
        index: true
    },
    preferences: {
        preferredVisitDuration: { type: Number, default: 60 },
        preferredStartTime: { type: String, default: '09:00' },
        preferredEndTime: { type: String, default: '18:00' },
        breakDuration: { type: Number, default: 60 },
        maxVisitsPerDay: { type: Number, default: 4 },
        requiresTranslator: { type: Boolean, default: false },
        transportMode: {
            type: String,
            enum: ['car', 'public', 'walking'],
            default: 'car'
        },
    },
    sharedWith: [{
            email: { type: String, required: true },
            name: { type: String },
            sharedAt: { type: Date, default: Date.now },
        }],
    shareToken: { type: String, unique: true, sparse: true },
    notes: { type: String },
}, { timestamps: true });
// Indexes
TravelPlanSchema.index({ user: 1, status: 1 });
TravelPlanSchema.index({ 'destination.country': 1, 'destination.city': 1 });
TravelPlanSchema.index({ arrivalDate: 1, departureDate: 1 });
TravelPlanSchema.index({ shareToken: 1 });
exports.default = mongoose_1.default.model('TravelPlan', TravelPlanSchema);
