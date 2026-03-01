"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUncontactedLeadsJob = notifyUncontactedLeadsJob;
exports.triggerNotifyUncontactedLeadsJob = triggerNotifyUncontactedLeadsJob;
const LeadTagService_1 = require("../services/LeadTagService");
/**
 * Daily job to notify promoteurs about uncontacted leads after 2 days
 * Should be scheduled to run once per day (e.g., at 9 AM)
 */
async function notifyUncontactedLeadsJob() {
    console.log('[notifyUncontactedLeadsJob] Starting job to notify about uncontacted leads...');
    try {
        // Process leads not contacted after 2 days
        await LeadTagService_1.LeadTagService.processNotContactedReminders(2);
        console.log('[notifyUncontactedLeadsJob] Job completed successfully');
    }
    catch (error) {
        console.error('[notifyUncontactedLeadsJob] Job failed:', error);
        throw error;
    }
}
/**
 * Manual trigger endpoint - can be called from admin panel or cron service
 */
async function triggerNotifyUncontactedLeadsJob() {
    try {
        await notifyUncontactedLeadsJob();
        return { success: true, message: 'Job executed successfully' };
    }
    catch (error) {
        return { success: false, message: error.message };
    }
}
