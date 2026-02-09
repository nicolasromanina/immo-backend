import cron from 'node-cron';
import { FeaturedService } from '../services/FeaturedService';

export const startFeaturedSlotJob = () => {
  if (process.env.FEATURED_SLOT_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.FEATURED_SLOT_CRON || '0 * * * *';

  cron.schedule(schedule, async () => {
    try {
      console.log('[Job] Featured slot status check running...');
      const expired = await FeaturedService.updateSlotStatuses();
      console.log(`[Job] Featured slots expired: ${expired}`);
      // Auto-feature top projects weekly (run only at midnight)
      const now = new Date();
      if (now.getHours() === 0) {
        const autoFeatured = await FeaturedService.autoFeatureTopProjects();
        console.log(`[Job] Auto-featured top projects: ${autoFeatured}`);
      }
    } catch (error) {
      console.error('Featured slot job failed:', error);
    }
  });
};
