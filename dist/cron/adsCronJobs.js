"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAdsCronJobs = initAdsCronJobs;
exports.initAdsCronJobsOnStartup = initAdsCronJobsOnStartup;
const node_cron_1 = __importDefault(require("node-cron"));
const AdsService_1 = require("../services/AdsService");
const Ad_1 = __importDefault(require("../models/Ad"));
/**
 * Daily stats aggregation cron job
 * Runs every day at 00:01 UTC to update daily stats for all active ads
 */
function initAdsCronJobs() {
    // Schedule: runs at 00:01 every day (UTC)
    node_cron_1.default.schedule('1 0 * * *', async () => {
        try {
            console.log('[AdsCronJobs] Starting daily stats aggregation...');
            // Find all active ads
            const activeAds = await Ad_1.default.find({ status: 'active' });
            console.log(`[AdsCronJobs] Found ${activeAds.length} active ads to update`);
            let updated = 0;
            for (const ad of activeAds) {
                try {
                    await AdsService_1.AdsService.updateDailyStats(ad._id.toString());
                    updated++;
                }
                catch (err) {
                    console.error(`[AdsCronJobs] Error updating stats for ad ${ad._id}:`, err.message);
                }
            }
            console.log(`[AdsCronJobs] Daily stats aggregation completed: ${updated}/${activeAds.length} ads updated`);
        }
        catch (error) {
            console.error('[AdsCronJobs] Error in daily stats aggregation:', error.message);
        }
    });
    console.log('[AdsCronJobs] Initialized - Daily stats aggregation scheduled for 00:01 UTC');
}
/**
 * On startup, also do a catch-up update for today's stats if missing
 */
async function initAdsCronJobsOnStartup() {
    try {
        console.log('[AdsCronJobs] Running startup catch-up for today...');
        const activeAds = await Ad_1.default.find({ status: 'active' });
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        let caught = 0;
        for (const ad of activeAds) {
            // Check if today's stat exists
            const hasTodayStat = ad.dailyStats.some(stat => {
                const statDate = new Date(stat.date);
                statDate.setUTCHours(0, 0, 0, 0);
                return statDate.getTime() === today.getTime();
            });
            if (!hasTodayStat) {
                await AdsService_1.AdsService.updateDailyStats(ad._id.toString());
                caught++;
            }
        }
        console.log(`[AdsCronJobs] Startup catch-up completed: ${caught} ads updated`);
    }
    catch (error) {
        console.error('[AdsCronJobs] Error in startup catch-up:', error.message);
    }
}
