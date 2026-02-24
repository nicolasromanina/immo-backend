"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPriceRecalculationJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const PriceAnalyticsService_1 = require("../services/PriceAnalyticsService");
const startPriceRecalculationJob = () => {
    if (process.env.PRICE_RECALCULATION_CRON_ENABLED === 'false') {
        return;
    }
    // Run weekly on Sunday at 4 AM
    const schedule = process.env.PRICE_RECALCULATION_CRON || '0 4 * * 0';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            console.log('[Job] Price stats recalculation running...');
            const result = await PriceAnalyticsService_1.PriceAnalyticsService.recalculateAllStats();
            console.log(`[Job] Price stats recalculated: ${result.updated} updated, ${result.errors} errors`);
        }
        catch (error) {
            console.error('Price recalculation job failed:', error);
        }
    });
};
exports.startPriceRecalculationJob = startPriceRecalculationJob;
