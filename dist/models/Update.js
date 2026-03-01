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
const UpdateSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    photos: {
        type: [String],
        required: true,
        validate: {
            validator: function (v) {
                return v && v.length === 3;
            },
            message: 'Exactly 3 photos are required for each update'
        }
    },
    geolocatedPhotos: [{
            url: { type: String, required: true },
            capturedAt: { type: Date, required: true },
            uploadedAt: { type: Date, default: Date.now },
            geolocation: {
                latitude: { type: Number },
                longitude: { type: Number },
                accuracy: { type: Number },
                altitude: { type: Number },
            },
            deviceInfo: {
                deviceId: { type: String },
                deviceModel: { type: String },
                platform: { type: String, enum: ['ios', 'android', 'web'] },
            },
            verified: { type: Boolean, default: false },
            verificationScore: { type: Number, min: 0, max: 100 },
            verificationDetails: {
                distanceFromProject: { type: Number },
                timestampValid: { type: Boolean },
                geoMatch: { type: Boolean },
            },
        }],
    whatsDone: { type: String, required: true },
    nextStep: { type: String, required: true },
    nextMilestoneDate: { type: Date, required: true },
    risksIdentified: { type: String, required: true },
    projectStatus: {
        type: String,
        enum: ['permis-de-construire', 'pre-commercialisation', 'demarrage-chantier', 'fondations', 'gros-oeuvres', 'second-oeuvres', 'livraison'],
    },
    progressDescription: { type: String },
    expectedDeliveryDate: { type: Date },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'published'],
        default: 'draft'
    },
    scheduledFor: { type: Date },
    publishedAt: { type: Date },
    milestone: {
        name: { type: String },
        percentage: { type: Number, min: 0, max: 100 },
        phase: {
            type: String,
            enum: ['fondations', 'structure', 'gros-oeuvre', 'finitions', 'livre']
        },
    },
    views: { type: Number, default: 0 },
    reactions: [{
            userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            type: { type: String, enum: ['like', 'helpful'], required: true },
            reactedAt: { type: Date, default: Date.now },
        }],
    flagged: { type: Boolean, default: false },
    flagReason: { type: String },
}, { timestamps: true });
UpdateSchema.index({ project: 1, publishedAt: -1 });
UpdateSchema.index({ promoteur: 1, status: 1 });
UpdateSchema.index({ status: 1, scheduledFor: 1 });
exports.default = mongoose_1.default.model('Update', UpdateSchema);
