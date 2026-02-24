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
const FeaturedSlotSchema = new mongoose_1.Schema({
    entityType: {
        type: String,
        enum: ['project', 'promoteur'],
        required: true
    },
    entity: {
        type: mongoose_1.Schema.Types.ObjectId,
        refPath: 'entityType',
        required: true,
        index: true
    },
    placement: {
        type: String,
        enum: ['annuaires', 'search', 'newsletter', 'category', 'city'],
        required: true,
        index: true
    },
    position: { type: Number, default: 0 },
    country: { type: String },
    city: { type: String },
    category: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'expired', 'cancelled'],
        default: 'scheduled',
        index: true
    },
    type: {
        type: String,
        enum: ['automatic', 'manual', 'paid'],
        default: 'manual'
    },
    payment: {
        amount: { type: Number },
        currency: { type: String, default: 'XOF' },
        invoiceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Invoice' },
        paidAt: { type: Date },
    },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    notes: { type: String },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
FeaturedSlotSchema.index({ placement: 1, status: 1, startDate: 1, endDate: 1 });
FeaturedSlotSchema.index({ entity: 1, entityType: 1 });
exports.default = mongoose_1.default.model('FeaturedSlot', FeaturedSlotSchema);
