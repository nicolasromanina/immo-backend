import cron from 'node-cron';
import { LeadFollowUpService } from '../services/LeadFollowUpService';
import { AuditLogService } from '../services/AuditLogService';

export const startLeadFollowUpJob = () => {
  if (process.env.LEAD_FOLLOWUP_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.LEAD_FOLLOWUP_CRON || '0 * * * *';

  cron.schedule(schedule, async () => {
    try {
      const overdue = await LeadFollowUpService.notifyOverdueFollowUps();
      const unanswered = await LeadFollowUpService.notifyUnansweredNewLeads();

      if (overdue > 0 || unanswered > 0) {
        await AuditLogService.log({
          actor: 'system',
          actorRole: 'system',
          action: 'lead_followup_reminders',
          category: 'lead',
          description: `Sent ${overdue} overdue follow-up(s), ${unanswered} unanswered lead alert(s)`,
        });
      }
    } catch (error) {
      console.error('Lead follow-up job failed:', error);
    }
  });
};
