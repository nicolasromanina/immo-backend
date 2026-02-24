"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSubscriptionBillingJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const SubscriptionBillingService_1 = require("../services/SubscriptionBillingService");
const AuditLogService_1 = require("../services/AuditLogService");
const startSubscriptionBillingJob = () => {
    if (process.env.BILLING_CRON_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.BILLING_CRON || '0 9 * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            const remindersSent = await SubscriptionBillingService_1.SubscriptionBillingService.sendUpcomingRenewalReminders();
            const pastDueSent = await SubscriptionBillingService_1.SubscriptionBillingService.notifyPastDueSubscriptions();
            if (remindersSent > 0 || pastDueSent > 0) {
                await AuditLogService_1.AuditLogService.log({
                    actor: 'system',
                    actorRole: 'system',
                    action: 'billing_reminders',
                    category: 'system',
                    description: `Sent ${remindersSent} renewal reminder(s), ${pastDueSent} past-due alert(s)`,
                });
            }
        }
        catch (error) {
            console.error('Subscription billing job failed:', error);
        }
    });
};
exports.startSubscriptionBillingJob = startSubscriptionBillingJob;
