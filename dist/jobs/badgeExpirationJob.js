"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBadgeExpirationJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const BadgeService_1 = require("../services/BadgeService");
const startBadgeExpirationJob = () => {
    if (process.env.BADGE_EXPIRATION_CRON_ENABLED === 'false') {
        return;
    }
    // Run daily at 1 AM
    const schedule = process.env.BADGE_EXPIRATION_CRON || '0 1 * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            console.log('[Job] Badge expiration check running...');
            const result = await BadgeService_1.BadgeService.checkExpiredBadges();
            console.log(`[Job] Expired badges removed: ${result.totalRemoved}`);
        }
        catch (error) {
            console.error('Badge expiration job failed:', error);
        }
    });
};
exports.startBadgeExpirationJob = startBadgeExpirationJob;
