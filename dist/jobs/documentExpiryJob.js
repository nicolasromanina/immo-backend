"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDocumentExpiryJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const DocumentExpiryService_1 = require("../services/DocumentExpiryService");
const AuditLogService_1 = require("../services/AuditLogService");
const startDocumentExpiryJob = () => {
    if (process.env.DOCS_EXPIRED_CRON_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.DOCS_EXPIRED_CRON || '0 3 * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            const expiredMarked = await DocumentExpiryService_1.DocumentExpiryService.markExpiredDocuments();
            await AuditLogService_1.AuditLogService.log({
                actor: 'system',
                actorRole: 'system',
                action: 'check_expired_documents',
                category: 'document',
                description: `Marked ${expiredMarked} document(s) as expired`,
            });
        }
        catch (error) {
            console.error('Document expiry job failed:', error);
        }
    });
};
exports.startDocumentExpiryJob = startDocumentExpiryJob;
