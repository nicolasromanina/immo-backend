"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSLAMonitoringJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const SLATrackingService_1 = require("../services/SLATrackingService");
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const startSLAMonitoringJob = () => {
    if (process.env.SLA_MONITORING_CRON_ENABLED === 'false') {
        return;
    }
    // Run every 2 hours
    const schedule = process.env.SLA_MONITORING_CRON || '0 */2 * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            console.log('[Job] SLA monitoring running...');
            // Monitor recent leads and calculate response times
            const updates = await SLATrackingService_1.SLATrackingService.monitorRecentLeads(72);
            console.log(`[Job] SLA monitored: ${updates.length} leads updated`);
            // Update badges for all active promoteurs with leads
            const promoteurs = await Promoteur_1.default.find({
                subscriptionStatus: { $in: ['active', 'trial'] },
                totalLeadsReceived: { $gt: 0 },
            }).select('_id');
            let badgesUpdated = 0;
            for (const promoteur of promoteurs) {
                try {
                    await SLATrackingService_1.SLATrackingService.updateBadgesBasedOnSLA(promoteur._id.toString());
                    badgesUpdated++;
                }
                catch (err) {
                    console.error(`[Job] SLA badge update failed for ${promoteur._id}:`, err);
                }
            }
            console.log(`[Job] SLA badges evaluated: ${badgesUpdated} promoteurs`);
        }
        catch (error) {
            console.error('SLA monitoring job failed:', error);
        }
    });
};
exports.startSLAMonitoringJob = startSLAMonitoringJob;
