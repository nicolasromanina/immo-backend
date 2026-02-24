"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startFeaturedSlotJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const FeaturedService_1 = require("../services/FeaturedService");
const startFeaturedSlotJob = () => {
    if (process.env.FEATURED_SLOT_CRON_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.FEATURED_SLOT_CRON || '0 * * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            console.log('[Job] Featured slot status check running...');
            const expired = await FeaturedService_1.FeaturedService.updateSlotStatuses();
            console.log(`[Job] Featured slots expired: ${expired}`);
            // Auto-feature top projects weekly (run only at midnight)
            const now = new Date();
            if (now.getHours() === 0) {
                const autoFeatured = await FeaturedService_1.FeaturedService.autoFeatureTopProjects();
                console.log(`[Job] Auto-featured top projects: ${autoFeatured}`);
            }
        }
        catch (error) {
            console.error('Featured slot job failed:', error);
        }
    });
};
exports.startFeaturedSlotJob = startFeaturedSlotJob;
