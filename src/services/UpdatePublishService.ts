import Update from '../models/Update';
import Project from '../models/Project';
import Favorite from '../models/Favorite';
import { NotificationService } from './NotificationService';
import { TrustScoreService } from './TrustScoreService';

export class UpdatePublishService {
  private static buildProjectProgressDescription(update: any): string {
    if (typeof update.progressDescription === 'string' && update.progressDescription.trim()) {
      return update.progressDescription.trim();
    }

    const parts: string[] = [];
    if (update.whatsDone) {
      parts.push(`Travaux realises: ${update.whatsDone}`);
    }
    if (update.nextStep) {
      parts.push(`Prochaine etape: ${update.nextStep}`);
    }
    if (update.nextMilestoneDate) {
      const milestoneDate = new Date(update.nextMilestoneDate);
      if (!Number.isNaN(milestoneDate.getTime())) {
        parts.push(
          `Prochain jalon le ${new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }).format(milestoneDate)}`
        );
      }
    }
    if (update.risksIdentified) {
      parts.push(`Risques identifies: ${update.risksIdentified}`);
    }

    return parts.join('. ');
  }

  static async publishUpdate(updateId: string) {
    const update = await Update.findById(updateId);
    if (!update) return null;

    update.status = 'published';
    update.publishedAt = new Date();
    await update.save();

    const project = await Project.findById(update.project);
    if (project) {
      const syncedProgressDescription = this.buildProjectProgressDescription(update);
      if (syncedProgressDescription) {
        project.progressDescription = syncedProgressDescription;
      }

      if (update.projectStatus) {
        project.status = update.projectStatus as any;
      }

      if (update.expectedDeliveryDate) {
        project.timeline = project.timeline || {};
        project.timeline.deliveryDate = new Date(update.expectedDeliveryDate);
      }

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
