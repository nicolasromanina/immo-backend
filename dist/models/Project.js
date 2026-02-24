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
const ProjectSchema = new mongoose_1.Schema({
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    shortDescription: { type: String, maxlength: 150 },
    projectOverview: { type: String },
    locationDescription: { type: String },
    progressDescription: { type: String },
    projectType: { type: String, enum: ['villa', 'immeuble'], required: true },
    availability: { type: String },
    typeDetails: {
        villa: {
            landArea: { type: Number },
            builtArea: { type: Number },
            units: { type: Number },
            bedrooms: { type: Number },
        },
        immeuble: {
            floors: { type: Number },
            totalUnits: { type: Number },
            elevators: { type: Number },
            parkingSpaces: { type: Number },
        },
    },
    country: { type: String, required: true, index: true },
    city: { type: String, required: true, index: true },
    area: { type: String, required: true },
    address: { type: String },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number },
    },
    typologies: [{
            name: { type: String, required: true },
            surface: { type: Number, required: true },
            price: { type: Number, required: true },
            available: { type: Number, required: true },
        }],
    priceFrom: { type: Number, required: true, index: true },
    currency: { type: String, default: 'EUR' },
    timeline: {
        preCommercializationDate: { type: Date },
        constructionStartDate: { type: Date },
        deliveryDate: { type: Date, index: true },
        actualDeliveryDate: { type: Date },
    },
    status: {
        type: String,
        enum: ['pre-commercialisation', 'en-construction', 'gros-oeuvre', 'livre', 'pause', 'archive', 'suspended'],
        default: 'pre-commercialisation',
        index: true
    },
    publicationStatus: {
        type: String,
        enum: ['draft', 'pending', 'published', 'rejected'],
        default: 'draft',
        index: true
    },
    pauseInfo: {
        reason: { type: String, enum: ['intemperies', 'administratif', 'financement', 'autre'] },
        description: { type: String },
        pausedAt: { type: Date },
        estimatedResumeDate: { type: Date },
        supportingDocuments: [{ type: String }],
    },
    media: {
        coverImage: { type: String },
        renderings: [{ type: mongoose_1.Schema.Types.Mixed }],
        photos: [{ type: mongoose_1.Schema.Types.Mixed }],
        videos: [{ type: mongoose_1.Schema.Types.Mixed }],
        floorPlans: [{ type: mongoose_1.Schema.Types.Mixed }],
    },
    features: [{ type: String }],
    amenities: [{ type: String }],
    lastUpdateDate: { type: Date },
    updateFrequency: { type: Number, default: 0 },
    totalUpdates: { type: Number, default: 0 },
    changesLog: [{
            field: { type: String, required: true },
            oldValue: { type: mongoose_1.Schema.Types.Mixed },
            newValue: { type: mongoose_1.Schema.Types.Mixed },
            reason: { type: String, required: true },
            changedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            changedAt: { type: Date, default: Date.now },
        }],
    delays: [{
            reason: { type: String, required: true },
            originalDate: { type: Date, required: true },
            newDate: { type: Date, required: true },
            mitigationPlan: { type: String, required: true },
            reportedAt: { type: Date, default: Date.now },
        }],
    risks: [{
            type: {
                type: String,
                enum: ['financement', 'approvisionnement', 'administratif', 'autre'],
                required: true
            },
            description: { type: String, required: true },
            severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
            mitigationPlan: { type: String, required: true },
            status: { type: String, enum: ['active', 'resolved'], default: 'active' },
            reportedAt: { type: Date, default: Date.now },
            resolvedAt: { type: Date },
        }],
    trustScore: { type: Number, default: 0, min: 0, max: 100 },
    completenessScore: { type: Number, default: 0, min: 0, max: 100 },
    assignedTeam: [{
            userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            role: { type: String, enum: ['commercial', 'technique'], required: true },
        }],
    views: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    totalLeads: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    faq: [{
            question: { type: String, required: true },
            answer: { type: String, required: true },
            addedAt: { type: Date, default: Date.now },
        }],
    moderationNotes: [{
            note: { type: String, required: true },
            addedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            addedAt: { type: Date, default: Date.now },
        }],
    rejectionReason: { type: String },
    isFeatured: { type: Boolean, default: false },
    featuredUntil: { type: Date },
    boosts: [{
            paymentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Payment', required: true },
            type: {
                type: String,
                enum: ['basic', 'premium', 'enterprise', 'custom'],
                required: true
            },
            startDate: { type: Date, required: true },
            endDate: { type: Date, required: true },
            status: {
                type: String,
                enum: ['active', 'expired', 'canceled'],
                default: 'active'
            }
        }],
}, { timestamps: true });
ProjectSchema.index({ promoteur: 1, status: 1 });
ProjectSchema.index({ publicationStatus: 1, status: 1 });
ProjectSchema.index({ trustScore: -1 });
ProjectSchema.index({ 'timeline.deliveryDate': 1 });
ProjectSchema.index({ slug: 1 });
ProjectSchema.index({ country: 1, city: 1, projectType: 1 });
exports.default = mongoose_1.default.model('Project', ProjectSchema);
