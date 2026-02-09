import Update from '../models/Update';
import Project from '../models/Project';
import Favorite from '../models/Favorite';
import { NotificationService } from './NotificationService';
import { TrustScoreService } from './TrustScoreService';

export class UpdatePublishService {
  static async publishUpdate(updateId: string) {
    const update = await Update.findById(updateId);
    if (!update) return null;

    update.status = 'published';
    update.publishedAt = new Date();
    await update.save();

    const project = await Project.findById(update.project);
    if (project) {
      project.lastUpdateDate = new Date();
      project.totalUpdates += 1;
      await project.save();

      await TrustScoreService.calculateProjectTrustScore(project._id.toString());

      const favorites = await Favorite.find({ project: project._id, alertOnUpdate: true });
      const followerIds = favorites.map(f => f.user.toString());

      if (followerIds.length > 0) {
        await NotificationService.notifyProjectUpdate({
          projectId: project._id.toString(),
          projectTitle: project.title,
          updateId: update._id.toString(),
          followerIds,
        });
      }
    }

    return update;
  }
}
