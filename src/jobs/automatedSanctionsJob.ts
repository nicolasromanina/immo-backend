import cron from 'node-cron';
import { AutomatedSanctionsService } from '../services/AutomatedSanctionsService';

export const startAutomatedSanctionsJob = () => {
  if (process.env.AUTOMATED_SANCTIONS_CRON_ENABLED === 'false') {
    return;
  }

  // Run daily at 3 AM
  const schedule = process.env.AUTOMATED_SANCTIONS_CRON || '0 3 * * *';

  cron.schedule(schedule, async () => {
    try {
      console.log('[Job] Automated sanctions check running...');

      // Check and apply sanctions for update frequency violations
      const sanctions = await AutomatedSanctionsService.checkUpdateFrequency();
      console.log(`[Job] Sanctions applied: ${sanctions.length}`);

      // Remove expired restrictions
      const removed = await AutomatedSanctionsService.removeExpiredRestrictions();
      console.log(`[Job] Expired restrictions removed: ${removed.removed}`);
    } catch (error) {
      console.error('Automated sanctions job failed:', error);
    }
  });
};
