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
const ProjectBrochureSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    promoteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Promoteur', required: true, index: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileType: { type: String, required: true },
    fileUrl: { type: String, required: true },
    title: { type: String },
    description: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    lastUpdatedAt: { type: Date },
    totalDownloads: { type: Number, default: 0 },
    lastDownloadedAt: { type: Date },
}, { timestamps: true });
// Index for fast lookups
ProjectBrochureSchema.index({ project: 1 });
ProjectBrochureSchema.index({ promoteur: 1 });
ProjectBrochureSchema.index({ project: 1, promoteur: 1 });
exports.default = mongoose_1.default.model('ProjectBrochure', ProjectBrochureSchema);
