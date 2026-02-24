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
const SupportTicketSchema = new mongoose_1.Schema({
    ticketNumber: { type: String, required: true, unique: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    category: {
        type: String,
        enum: ['technical', 'account', 'billing', 'feature-request', 'bug-report', 'appointment_request', 'other'],
        required: true,
        index: true,
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true,
    },
    status: {
        type: String,
        enum: ['open', 'in-progress', 'waiting-user', 'waiting-admin', 'resolved', 'closed'],
        default: 'open',
        index: true,
    },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    messages: [{
            sender: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            senderRole: { type: String, enum: ['user', 'admin', 'support', 'system'], required: true },
            content: { type: String, required: true },
            attachments: [{ type: String }],
            sentAt: { type: Date, default: Date.now },
            isInternal: { type: Boolean, default: false },
        }],
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    satisfaction: {
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        submittedAt: { type: Date },
    },
    tags: [{ type: String }],
    // Public submission fields (for unauthenticated appointment requests)
    submitterEmail: { type: String },
    submitterPhone: { type: String },
    submitterName: { type: String },
    appointmentDate: { type: String },
    appointmentTime: { type: String },
    projectId: { type: String },
}, { timestamps: true });
SupportTicketSchema.index({ status: 1, priority: 1 });
SupportTicketSchema.index({ ticketNumber: 1 });
SupportTicketSchema.index({ assignedTo: 1, status: 1 });
SupportTicketSchema.pre('validate', async function (next) {
    if (!this.ticketNumber) {
        const count = await mongoose_1.default.model('SupportTicket').countDocuments();
        this.ticketNumber = `TK-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});
exports.default = mongoose_1.default.model('SupportTicket', SupportTicketSchema);
