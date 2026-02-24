"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGDPRDeadlineJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const GDPRService_1 = require("../services/GDPRService");
const startGDPRDeadlineJob = () => {
    if (process.env.GDPR_DEADLINE_CRON_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.GDPR_DEADLINE_CRON || '0 8 * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            console.log('[Job] GDPR deadline check running...');
            const nearingDeadline = await GDPRService_1.GDPRService.checkDeadlines();
            console.log(`[Job] GDPR requests nearing deadline: ${nearingDeadline}`);
        }
        catch (error) {
            console.error('GDPR deadline job failed:', error);
        }
    });
};
exports.startGDPRDeadlineJob = startGDPRDeadlineJob;
