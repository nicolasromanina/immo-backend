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
const TeamActivitySchema = new mongoose_1.Schema({
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
    actor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
        type: String,
        enum: ['created', 'updated', 'deleted', 'assigned', 'status_changed', 'note_added', 'viewed'],
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: ['lead', 'project', 'team', 'permission', 'assignment'],
        required: true,
        index: true
    },
    targetType: { type: String, required: true, index: true },
    targetId: { type: mongoose_1.Schema.Types.ObjectId, index: true },
    targetName: { type: String },
    details: {
        before: { type: mongoose_1.Schema.Types.Mixed },
        after: { type: mongoose_1.Schema.Types.Mixed },
        changes: { type: mongoose_1.Schema.Types.Mixed },
    },
    leadAssignment: {
        leadId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Lead' },
        assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
        assignedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    },
    timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });
TeamActivitySchema.index({ promoteur: 1, timestamp: -1 });
TeamActivitySchema.index({ actor: 1, timestamp: -1 });
TeamActivitySchema.index({ category: 1, action: 1, timestamp: -1 });
exports.default = mongoose_1.default.model('TeamActivity', TeamActivitySchema);
