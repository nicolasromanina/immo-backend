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
const PartnerSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ['inspection', 'courtier', 'notaire', 'banque', 'assurance', 'architecte', 'autre'],
        required: true,
        index: true
    },
    description: { type: String, required: true },
    logo: { type: String },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    website: { type: String },
    address: { type: String },
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: 'pending',
        index: true
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    countries: [{ type: String }],
    cities: [{ type: String }],
    totalRequests: { type: Number, default: 0 },
    completedRequests: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    badges: [{ type: String }],
    commissionRate: { type: Number },
}, { timestamps: true });
PartnerSchema.index({ type: 1, status: 1 });
// Avoid compound index on two array fields (Mongo "parallel arrays" limitation).
PartnerSchema.index({ countries: 1 });
PartnerSchema.index({ cities: 1 });
exports.default = mongoose_1.default.model('Partner', PartnerSchema);
