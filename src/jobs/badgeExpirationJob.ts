import cron from 'node-cron';
import { BadgeService } from '../services/BadgeService';

export const startBadgeExpirationJob = () => {
  if (process.env.BADGE_EXPIRATION_CRON_ENABLED === 'false') {
    return;
  }

  // Run daily at 1 AM
  const schedule = process.env.BADGE_EXPIRATION_CRON || '0 1 * * *';

  cron.schedule(schedule, async () => {
    try {
      console.log('[Job] Badge expiration check running...');
      const result = await BadgeService.checkExpiredBadges();
      console.log(`[Job] Expired badges removed: ${result.totalRemoved}`);
    } catch (error) {
      console.error('Badge expiration job failed:', error);
    }
  });
};
