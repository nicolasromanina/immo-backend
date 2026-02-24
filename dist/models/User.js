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
const roles_1 = require("../config/roles");
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    roles: { type: [String], enum: Object.values(roles_1.Role), default: [roles_1.Role.USER] },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true },
    country: { type: String },
    city: { type: String },
    avatar: { type: String },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
    lastLogin: { type: Date },
    preferences: {
        language: { type: String, enum: ['fr', 'en'], default: 'fr' },
        currency: { type: String, default: 'XOF' },
        notifications: {
            email: { type: Boolean, default: true },
            whatsapp: { type: Boolean, default: false },
            projectUpdates: { type: Boolean, default: true },
            newLeads: { type: Boolean, default: true },
        },
    },
    promoteurProfile: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur' },
    clientProfile: {
        budget: { type: Number },
        projectType: { type: String, enum: ['villa', 'immeuble', 'both'] },
        preferredCountries: [{ type: String }],
        preferredCities: [{ type: String }],
        deliveryTimeline: { type: String },
    },
}, { timestamps: true });
UserSchema.index({ email: 1 });
UserSchema.index({ roles: 1 });
UserSchema.index({ status: 1 });
exports.default = mongoose_1.default.model('User', UserSchema);
