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
const AcademyCourseSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['onboarding', 'projects', 'leads', 'marketing', 'compliance', 'advanced'],
        required: true,
        index: true
    },
    modules: [{
            title: { type: String, required: true },
            order: { type: Number, required: true },
            lessons: [{
                    title: { type: String, required: true },
                    type: { type: String, enum: ['video', 'article', 'quiz'], required: true },
                    content: { type: String },
                    videoUrl: { type: String },
                    durationMinutes: { type: Number, default: 0 },
                    order: { type: Number, required: true },
                }],
        }],
    targetAudience: {
        type: String,
        enum: ['promoteur', 'admin', 'all'],
        default: 'promoteur'
    },
    requiredPlan: { type: String, enum: ['basique', 'standard', 'premium'] },
    prerequisites: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'AcademyCourse' }],
    hasCertificate: { type: Boolean, default: false },
    certificateTemplate: { type: String },
    passingScore: { type: Number },
    enrollments: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
        index: true
    },
    publishedAt: { type: Date },
}, { timestamps: true });
exports.default = mongoose_1.default.model('AcademyCourse', AcademyCourseSchema);
