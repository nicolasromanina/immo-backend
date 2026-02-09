import cron from 'node-cron';
import Update from '../models/Update';
import { UpdatePublishService } from '../services/UpdatePublishService';
import { AuditLogService } from '../services/AuditLogService';

export const startScheduledUpdatesJob = () => {
  if (process.env.UPDATES_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.UPDATES_CRON || '*/5 * * * *';

  cron.schedule(schedule, async () => {
    try {
      const now = new Date();
      const updates = await Update.find({
        status: 'scheduled',
        scheduledFor: { $lte: now },
      }).select('_id');

      for (const update of updates) {
        await UpdatePublishService.publishUpdate(update._id.toString());
      }

      if (updates.length > 0) {
        await AuditLogService.log({
          actor: 'system',
          actorRole: 'system',
          action: 'publish_scheduled_updates',
          category: 'project',
          description: `Published ${updates.length} scheduled update(s)`,
        });
      }
    } catch (error) {
      console.error('Scheduled updates job failed:', error);
    }
  });
};
