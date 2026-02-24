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
const NotificationSchema = new mongoose_1.Schema({
    recipient: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        enum: ['lead', 'update', 'project', 'badge', 'appeal', 'system', 'warning', 'achievement', 'reminder'],
        required: true,
        index: true
    },
    // Optional arbitrary data useful for scheduling/deduplication
    data: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedProject: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project' },
    relatedLead: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Lead' },
    relatedUpdate: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Update' },
    relatedAppeal: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Appeal' },
    channels: {
        email: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true },
    },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    actionUrl: { type: String },
    actionLabel: { type: String },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    scheduledFor: { type: Date },
    sentAt: { type: Date },
}, { timestamps: true });
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ priority: 1, read: 1 });
exports.default = mongoose_1.default.model('Notification', NotificationSchema);
