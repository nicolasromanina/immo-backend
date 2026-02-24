"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAutomatedSanctionsJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const AutomatedSanctionsService_1 = require("../services/AutomatedSanctionsService");
const startAutomatedSanctionsJob = () => {
    if (process.env.AUTOMATED_SANCTIONS_CRON_ENABLED === 'false') {
        return;
    }
    // Run daily at 3 AM
    const schedule = process.env.AUTOMATED_SANCTIONS_CRON || '0 3 * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            console.log('[Job] Automated sanctions check running...');
            // Check and apply sanctions for update frequency violations
            const sanctions = await AutomatedSanctionsService_1.AutomatedSanctionsService.checkUpdateFrequency();
            console.log(`[Job] Sanctions applied: ${sanctions.length}`);
            // Remove expired restrictions
            const removed = await AutomatedSanctionsService_1.AutomatedSanctionsService.removeExpiredRestrictions();
            console.log(`[Job] Expired restrictions removed: ${removed.removed}`);
        }
        catch (error) {
            console.error('Automated sanctions job failed:', error);
        }
    });
};
exports.startAutomatedSanctionsJob = startAutomatedSanctionsJob;
