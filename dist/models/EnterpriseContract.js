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
const EnterpriseContractSchema = new mongoose_1.Schema({
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
    contractNumber: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    pricing: {
        type: { type: String, enum: ['fixed', 'custom', 'volume'], required: true },
        baseAmount: { type: Number, required: true },
        currency: { type: String, default: 'XOF' },
        billingCycle: { type: String, enum: ['monthly', 'quarterly', 'annual'], default: 'annual' },
        volumeDiscounts: [{
                minProjects: { type: Number, required: true },
                discountPercent: { type: Number, required: true },
            }],
    },
    inclusions: {
        maxProjects: { type: Number, default: -1 },
        maxTeamMembers: { type: Number, default: 10 },
        maxLeadsPerMonth: { type: Number, default: -1 },
        dedicatedSupport: { type: Boolean, default: true },
        customBranding: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        priorityListing: { type: Boolean, default: true },
        customReports: { type: Boolean, default: false },
    },
    sla: {
        supportResponseTimeHours: { type: Number, default: 4 },
        uptimeGuarantee: { type: Number, default: 99.9 },
        dedicatedAccountManager: { type: Boolean, default: true },
        accountManagerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    },
    terms: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        autoRenew: { type: Boolean, default: true },
        noticePeriodDays: { type: Number, default: 30 },
        terminationClause: { type: String },
    },
    status: {
        type: String,
        enum: ['draft', 'pending_approval', 'active', 'expired', 'terminated'],
        default: 'draft',
        index: true
    },
    signedByPromoteur: { type: Boolean, default: false },
    signedByPromoteurAt: { type: Date },
    signedByAdmin: { type: Boolean, default: false },
    signedByAdminAt: { type: Date },
    signedByAdminUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    contractDocument: { type: String },
    amendments: [{
            description: { type: String, required: true },
            documentUrl: { type: String },
            effectiveDate: { type: Date, required: true },
            createdAt: { type: Date, default: Date.now },
        }],
    notes: [{
            content: { type: String, required: true },
            addedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            addedAt: { type: Date, default: Date.now },
        }],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
exports.default = mongoose_1.default.model('EnterpriseContract', EnterpriseContractSchema);
