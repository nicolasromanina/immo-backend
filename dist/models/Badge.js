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
const BadgeSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    iconBg: { type: String, default: 'bg-blue-500' },
    category: {
        type: String,
        enum: ['verification', 'performance', 'trust', 'engagement', 'special'],
        required: true,
        index: true
    },
    criteria: {
        type: { type: String, enum: ['auto', 'manual'], required: true },
        rules: [{
                field: { type: String },
                operator: { type: String },
                value: { type: mongoose_1.Schema.Types.Mixed },
            }],
    },
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    hasExpiration: { type: Boolean, default: false },
    expirationDays: { type: Number },
    trustScoreBonus: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    activeCount: { type: Number, default: 0 },
}, { timestamps: true });
BadgeSchema.index({ slug: 1 });
BadgeSchema.index({ category: 1, isActive: 1 });
exports.default = mongoose_1.default.model('Badge', BadgeSchema);
