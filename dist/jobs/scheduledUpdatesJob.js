"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduledUpdatesJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const Update_1 = __importDefault(require("../models/Update"));
const UpdatePublishService_1 = require("../services/UpdatePublishService");
const AuditLogService_1 = require("../services/AuditLogService");
const startScheduledUpdatesJob = () => {
    if (process.env.UPDATES_CRON_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.UPDATES_CRON || '*/5 * * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            const now = new Date();
            const updates = await Update_1.default.find({
                status: 'scheduled',
                scheduledFor: { $lte: now },
            }).select('_id');
            for (const update of updates) {
                await UpdatePublishService_1.UpdatePublishService.publishUpdate(update._id.toString());
            }
            if (updates.length > 0) {
                await AuditLogService_1.AuditLogService.log({
                    actor: 'system',
                    actorRole: 'system',
                    action: 'publish_scheduled_updates',
                    category: 'project',
                    description: `Published ${updates.length} scheduled update(s)`,
                });
            }
        }
        catch (error) {
            console.error('Scheduled updates job failed:', error);
        }
    });
};
exports.startScheduledUpdatesJob = startScheduledUpdatesJob;
