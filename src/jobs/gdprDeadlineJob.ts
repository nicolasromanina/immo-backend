import cron from 'node-cron';
import { GDPRService } from '../services/GDPRService';

export const startGDPRDeadlineJob = () => {
  if (process.env.GDPR_DEADLINE_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.GDPR_DEADLINE_CRON || '0 8 * * *';

  cron.schedule(schedule, async () => {
    try {
      console.log('[Job] GDPR deadline check running...');
      const nearingDeadline = await GDPRService.checkDeadlines();
      console.log(`[Job] GDPR requests nearing deadline: ${nearingDeadline}`);
    } catch (error) {
      console.error('GDPR deadline job failed:', error);
    }
  });
};
