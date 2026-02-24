"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentExpiryService = void 0;
const Document_1 = __importDefault(require("../models/Document"));
const NotificationService_1 = require("./NotificationService");
class DocumentExpiryService {
    static async markExpiredDocuments() {
        const now = new Date();
        const documents = await Document_1.default.find({
            expiresAt: { $lte: now },
            status: { $ne: 'expire' },
        }).populate('promoteur', 'user organizationName');
        for (const document of documents) {
            document.status = 'expire';
            await document.save();
            const promoteur = document.promoteur;
            if (promoteur?.user) {
                await NotificationService_1.NotificationService.create({
                    recipient: promoteur.user.toString(),
                    type: 'warning',
                    title: 'Document expire',
                    message: `Votre document "${document.name}" est expire`,
                    priority: 'high',
                    channels: { inApp: true, email: true },
                });
            }
        }
        return documents.length;
    }
}
exports.DocumentExpiryService = DocumentExpiryService;
