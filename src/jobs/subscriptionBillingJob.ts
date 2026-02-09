import cron from 'node-cron';
import { SubscriptionBillingService } from '../services/SubscriptionBillingService';
import { AuditLogService } from '../services/AuditLogService';

export const startSubscriptionBillingJob = () => {
  if (process.env.BILLING_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.BILLING_CRON || '0 9 * * *';

  cron.schedule(schedule, async () => {
    try {
      const remindersSent = await SubscriptionBillingService.sendUpcomingRenewalReminders();
      const pastDueSent = await SubscriptionBillingService.notifyPastDueSubscriptions();

      if (remindersSent > 0 || pastDueSent > 0) {
        await AuditLogService.log({
          actor: 'system',
          actorRole: 'system',
          action: 'billing_reminders',
          category: 'system',
          description: `Sent ${remindersSent} renewal reminder(s), ${pastDueSent} past-due alert(s)`,
        });
      }
    } catch (error) {
      console.error('Subscription billing job failed:', error);
    }
  });
};
