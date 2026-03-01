import cron from 'node-cron';
import { LeadTagService } from '../services/LeadTagService';
import { AuditLogService } from '../services/AuditLogService';

/**
 * Job wrapper for notifying promoteurs about uncontacted leads after 2 days
 * Runs daily at 9 AM UTC by default
 */
export const startUncontactedLeadsNotificationJob = () => {
  // Check if job is disabled via environment variable
  if (process.env.UNCONTACTED_LEADS_CRON_ENABLED === 'false') {
    console.log('[UncontactedLeadsJob] Job is disabled via UNCONTACTED_LEADS_CRON_ENABLED=false');
    return;
  }

  // Default schedule: 0 9 * * * = Daily at 9 AM UTC
  // Can be overridden with env variable: UNCONTACTED_LEADS_CRON='0 9 * * *'
  const schedule = process.env.UNCONTACTED_LEADS_CRON || '0 9 * * *';

  console.log(`[UncontactedLeadsJob] Starting job with schedule: ${schedule}`);

  cron.schedule(schedule, async () => {
    try {
      console.log('[UncontactedLeadsJob] Running at', new Date().toISOString());

      // Process leads not contacted after 2 days
      await LeadTagService.processNotContactedReminders(2);

      // Log job execution
      await AuditLogService.log({
        actor: 'system',
        actorRole: 'system',
        action: 'uncontacted_leads_reminders',
        category: 'lead',
        description: 'Processed uncontacted leads reminders (2-day threshold)',
      });

      console.log('[UncontactedLeadsJob] Job completed successfully');
    } catch (error) {
      console.error('[UncontactedLeadsJob] Job failed:', error);

      // Log failure
      try {
        await AuditLogService.log({
          actor: 'system',
          actorRole: 'system',
          action: 'uncontacted_leads_reminders_failed',
          category: 'lead',
          description: `Job failed: ${(error as any)?.message || 'Unknown error'}`,
        });
      } catch (auditError) {
        console.error('[UncontactedLeadsJob] Failed to log audit:', auditError);
      }
    }
  });
};
