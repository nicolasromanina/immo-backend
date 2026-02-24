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
const DocumentSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    category: {
        type: String,
        enum: ['foncier', 'plans', 'permis', 'contrats', 'financier', 'technique', 'autre'],
        required: true,
        index: true
    },
    url: { type: String, required: true },
    size: { type: Number, required: true },
    visibility: {
        type: String,
        enum: ['public', 'private', 'shared'],
        default: 'private',
        index: true
    },
    sharedWith: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    status: {
        type: String,
        enum: ['fourni', 'manquant', 'expire', 'en-attente'],
        default: 'fourni',
        index: true
    },
    expiresAt: { type: Date },
    version: { type: Number, default: 1 },
    previousVersions: [{
            url: { type: String, required: true },
            uploadedAt: { type: Date, required: true },
            replacedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
        }],
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    verificationNotes: { type: String },
    uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    description: { type: String },
    tags: [{ type: String }],
    adminNotes: [{
            note: { type: String, required: true },
            addedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            addedAt: { type: Date, default: Date.now },
        }],
}, { timestamps: true });
DocumentSchema.index({ project: 1, category: 1 });
DocumentSchema.index({ promoteur: 1, status: 1 });
DocumentSchema.index({ visibility: 1 });
DocumentSchema.index({ expiresAt: 1 });
exports.default = mongoose_1.default.model('Document', DocumentSchema);
