import Update from '../models/Update';
import { UpdatePublishService } from './UpdatePublishService';

// Service qui publie automatiquement les updates planifiées à la date prévue
export class UpdateSchedulerService {
  static async publishDueScheduledUpdates() {
    const now = new Date();
    // On cherche les updates planifiées dont la date est passée ou aujourd'hui
    const dueUpdates = await Update.find({
      status: 'scheduled',
      scheduledFor: { $lte: now }
    });
    for (const update of dueUpdates) {
      await UpdatePublishService.publishUpdate(update._id.toString());
      console.log('[UpdateSchedulerService] Published scheduled update:', update._id.toString(), '| scheduledFor:', update.scheduledFor);
    }
    if (dueUpdates.length > 0) {
      console.log(`[UpdateSchedulerService] ${dueUpdates.length} scheduled updates published.`);
    }
  }
}
