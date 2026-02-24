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
const ManagedServiceSchema = new mongoose_1.Schema({
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
    type: {
        type: String,
        enum: ['full', 'partial', 'updates-only', 'leads-only'],
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'paused', 'terminated'],
        default: 'pending',
        index: true,
    },
    scope: {
        updateManagement: { type: Boolean, default: false },
        leadManagement: { type: Boolean, default: false },
        documentManagement: { type: Boolean, default: false },
        communicationManagement: { type: Boolean, default: false },
    },
    assignedManager: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    monthlyFee: { type: Number, required: true },
    currency: { type: String, default: 'EUR' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    activityLog: [{
            action: { type: String, required: true },
            performedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            performedAt: { type: Date, default: Date.now },
            details: { type: String },
        }],
    notes: { type: String },
}, { timestamps: true });
exports.default = mongoose_1.default.model('ManagedService', ManagedServiceSchema);
