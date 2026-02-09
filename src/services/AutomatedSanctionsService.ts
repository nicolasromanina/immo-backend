import Promoteur from '../models/Promoteur';
import Project from '../models/Project';
import Update from '../models/Update';
import { AuditLogService } from './AuditLogService';
import { NotificationService } from './NotificationService';

/**
 * Service for automated sanctions based on platform rules
 * Implements graduated sanctions system
 */
export class AutomatedSanctionsService {
  /**
   * Sanction levels
   */
  private static SANCTION_LEVELS = {
    warning: 1,
    restriction: 2,
    suspension: 3,
    ban: 4,
  };

  /**
   * Check and apply sanctions for lack of updates
   */
  static async checkUpdateFrequency() {
    const projects = await Project.find({
      publicationStatus: 'published',
      status: { $in: ['en-construction', 'gros-oeuvre'] },
    }).populate('promoteur');

    const sanctions: any[] = [];

    for (const project of projects) {
      const lastUpdate = await Update.findOne({
        project: project._id,
        status: 'published',
      }).sort({ publishedAt: -1 });

      if (!lastUpdate) {
        // No updates at all
        const daysSincePublication = Math.floor(
          (Date.now() - (project as any).createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSincePublication > 60) {
          // 60 days without any update = warning
          await this.applyWarning(
            project.promoteur as any,
            project._id,
            'Aucune mise à jour depuis 60 jours',
            'no-updates-60days'
          );
          sanctions.push({ project: project._id, sanction: 'warning', reason: 'no-updates-60days' });
        }
      } else {
        const daysSinceUpdate = Math.floor(
          (Date.now() - lastUpdate.publishedAt!.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceUpdate > 90) {
          // 90 days without update = suspension
          await this.applySuspension(
            project.promoteur as any,
            project._id,
            'Aucune mise à jour depuis 90 jours',
            30 // 30 days suspension
          );
          sanctions.push({ project: project._id, sanction: 'suspension', reason: 'no-updates-90days' });
        } else if (daysSinceUpdate > 60) {
          // 60 days without update = restriction
          await this.applyRestriction(
            project.promoteur as any,
            project._id,
            'Aucune mise à jour depuis 60 jours',
            'reduced-visibility'
          );
          sanctions.push({ project: project._id, sanction: 'restriction', reason: 'no-updates-60days' });
        } else if (daysSinceUpdate > 45) {
          // 45 days without update = warning
          await this.applyWarning(
            project.promoteur as any,
            project._id,
            'Aucune mise à jour depuis 45 jours',
            'no-updates-45days'
          );
          sanctions.push({ project: project._id, sanction: 'warning', reason: 'no-updates-45days' });
        }
      }
    }

    return sanctions;
  }

  /**
   * Apply a warning
   */
  static async applyWarning(
    promoteurId: string,
    projectId: string,
    reason: string,
    code: string
  ) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return;

    // Check if warning already exists
    const existingWarning = promoteur.restrictions.find(
      r => r.type === 'warning' && r.reason.includes(code)
    );

    if (existingWarning) return; // Already warned

    // Add warning
    promoteur.restrictions.push({
      type: 'warning',
      reason: `${reason} - ${code}`,
      appliedAt: new Date(),
    } as any);

    await promoteur.save();

    // Send notification
    await NotificationService.createNotification({
      user: promoteur.user,
      type: 'warning',
      title: 'Avertissement',
      message: reason,
      priority: 'high',
      link: `/projects/${projectId}`,
    });

    // Audit log
    await AuditLogService.log({
      actor: 'system',
      actorRole: 'system',
      action: 'sanction-applied',
      category: 'moderation',
      targetType: 'Promoteur',
      targetId: promoteurId,
      description: `Warning applied: ${reason}`,
      metadata: { sanction: 'warning', reason, code, projectId },
    });
  }

  /**
   * Apply a restriction
   */
  static async applyRestriction(
    promoteurId: string,
    projectId: string,
    reason: string,
    restrictionType: string
  ) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return;

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    promoteur.restrictions.push({
      type: restrictionType,
      reason,
      appliedAt: new Date(),
      expiresAt,
    } as any);

    await promoteur.save();

    // Update project visibility
    if (restrictionType === 'reduced-visibility') {
      await Project.findByIdAndUpdate(projectId, {
        isFeatured: false,
      });
    }

    // Send notification
    await NotificationService.createNotification({
      user: promoteur.user,
      type: 'error',
      title: 'Restriction appliquée',
      message: `${reason}. Cette restriction expire dans 30 jours.`,
      priority: 'high',
      link: `/projects/${projectId}`,
    });

    // Audit log
    await AuditLogService.log({
      actor: 'system',
      actorRole: 'system',
      action: 'sanction-applied',
      category: 'moderation',
      targetType: 'Promoteur',
      targetId: promoteurId,
      description: `Restriction applied: ${restrictionType}`,
      metadata: { sanction: 'restriction', restrictionType, reason, projectId, expiresAt },
    });
  }

  /**
   * Apply suspension
   */
  static async applySuspension(
    promoteurId: string,
    projectId: string,
    reason: string,
    durationDays: number
  ) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return;

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    promoteur.subscriptionStatus = 'suspended';
    promoteur.restrictions.push({
      type: 'suspension',
      reason,
      appliedAt: new Date(),
      expiresAt,
    } as any);

    await promoteur.save();

    // Suspend project
    await Project.findByIdAndUpdate(projectId, {
      status: 'suspended',
    });

    // Send notification
    await NotificationService.createNotification({
      user: promoteur.user,
      type: 'error',
      title: 'Compte suspendu',
      message: `Votre compte a été suspendu pour ${durationDays} jours. Raison: ${reason}`,
      priority: 'urgent',
      link: '/appeal',
    });

    // Audit log
    await AuditLogService.log({
      actor: 'system',
      actorRole: 'system',
      action: 'sanction-applied',
      category: 'moderation',
      targetType: 'Promoteur',
      targetId: promoteurId,
      description: `Suspension applied for ${durationDays} days: ${reason}`,
      metadata: { sanction: 'suspension', reason, durationDays, projectId, expiresAt },
    });
  }

  /**
   * Remove expired restrictions
   */
  static async removeExpiredRestrictions() {
    const promoteurs = await Promoteur.find({
      'restrictions.expiresAt': { $lte: new Date() },
    });

    let count = 0;

    for (const promoteur of promoteurs) {
      const originalCount = promoteur.restrictions.length;
      
      promoteur.restrictions = promoteur.restrictions.filter(
        (r: any) => !r.expiresAt || r.expiresAt > new Date()
      );

      if (promoteur.restrictions.length < originalCount) {
        count += originalCount - promoteur.restrictions.length;

        // If suspension expired, reactivate
        if (promoteur.subscriptionStatus === 'suspended') {
          promoteur.subscriptionStatus = 'active';
        }

        await promoteur.save();

        // Notify
        await NotificationService.createNotification({
          user: promoteur.user,
          type: 'success',
          title: 'Restriction levée',
          message: 'Votre restriction a expiré et a été levée.',
          priority: 'medium',
        });
      }
    }

    return { removed: count };
  }

  /**
   * Get sanction history for a promoteur
   */
  static async getSanctionHistory(promoteurId: string) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return null;

    const activeRestrictions = promoteur.restrictions.filter(
      (r: any) => !r.expiresAt || r.expiresAt > new Date()
    );

    const expiredRestrictions = promoteur.restrictions.filter(
      (r: any) => r.expiresAt && r.expiresAt <= new Date()
    );

    return {
      active: activeRestrictions,
      expired: expiredRestrictions,
      total: promoteur.restrictions.length,
      currentLevel: this.getSanctionLevel(activeRestrictions.length),
    };
  }

  /**
   * Get sanction level based on active restrictions
   */
  private static getSanctionLevel(activeCount: number): string {
    if (activeCount === 0) return 'none';
    if (activeCount === 1) return 'warning';
    if (activeCount === 2) return 'restricted';
    return 'high-risk';
  }
}
