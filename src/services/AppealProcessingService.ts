import Appeal from '../models/Appeal';
import Promoteur from '../models/Promoteur';
import { AuditLogService } from './AuditLogService';
import { NotificationService } from './NotificationService';

/**
 * Service for processing appeals (N1 and N2)
 * Implements the appeal workflow with deadlines
 */
export class AppealProcessingService {
  /**
   * Create a new appeal
   */
  static async createAppeal(params: {
    promoteurId: string;
    projectId?: string;
    type: string;
    reason: string;
    description: string;
    originalAction: {
      type: string;
      appliedBy: string;
      appliedAt: Date;
      reason: string;
    };
    evidence: any[];
    mitigationPlan: string;
  }) {
    const appeal = new Appeal({
      promoteur: params.promoteurId,
      project: params.projectId,
      type: params.type,
      reason: params.reason,
      description: params.description,
      originalAction: params.originalAction,
      evidence: params.evidence,
      mitigationPlan: params.mitigationPlan,
      status: 'pending',
      level: 1, // Start at N1
      submittedAt: new Date(),
      deadline: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours for N1
    });

    await appeal.save();

    // Notify admins
    await NotificationService.createAdminNotification({
      type: 'info',
      title: 'Nouvel appel reçu',
      message: `Appel ${appeal.type} de ${params.promoteurId}`,
      priority: 'high',
      link: `/admin/appeals/${appeal._id}`,
    });

    // Audit log
    await AuditLogService.log({
      actor: params.promoteurId,
      actorRole: 'promoteur',
      action: 'appeal-created',
      category: 'appeal',
      targetType: 'Appeal',
      targetId: appeal._id.toString(),
      description: `Appeal created: ${params.type}`,
      metadata: params,
    });

    return appeal;
  }

  /**
   * Assign appeal to a reviewer
   */
  static async assignAppeal(appealId: string, reviewerId: string) {
    const appeal = await Appeal.findById(appealId);
    if (!appeal) throw new Error('Appeal not found');

    appeal.assignedTo = reviewerId as any;
    appeal.status = 'under-review';
    appeal.reviewStartedAt = new Date();

    await appeal.save();

    // Notify reviewer
    await NotificationService.createNotification({
      user: reviewerId as any,
      type: 'info',
      title: 'Nouvel appel assigné',
      message: `Vous avez été assigné à l'appel #${appeal._id}`,
      priority: 'high',
      link: `/admin/appeals/${appealId}`,
    });

    return appeal;
  }

  /**
   * Add review note
   */
  static async addReviewNote(
    appealId: string,
    userId: string,
    note: string,
    isInternal: boolean = true
  ) {
    const appeal = await Appeal.findById(appealId);
    if (!appeal) throw new Error('Appeal not found');

    appeal.reviewNotes.push({
      note,
      addedBy: userId as any,
      addedAt: new Date(),
      isInternal,
    });

    await appeal.save();

    // If not internal, notify promoteur
    if (!isInternal) {
      await NotificationService.createNotification({
        user: appeal.promoteur,
        type: 'info',
        title: 'Mise à jour sur votre appel',
        message: note,
        priority: 'medium',
        link: `/appeals/${appealId}`,
      });
    }

    return appeal;
  }

  /**
   * Escalate appeal to N2
   */
  static async escalateToN2(
    appealId: string,
    escalatedBy: string,
    escalationReason: string
  ) {
    const appeal = await Appeal.findById(appealId);
    if (!appeal) throw new Error('Appeal not found');

    if (appeal.level !== 1) {
      throw new Error('Appeal can only be escalated from N1');
    }

    appeal.level = 2;
    appeal.status = 'escalated';
    appeal.escalated = true;
    appeal.escalationReason = escalationReason;
    appeal.escalatedAt = new Date();
    appeal.escalatedBy = escalatedBy as any;
    appeal.deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for N2
    appeal.assignedTo = undefined; // Reassign at N2

    await appeal.save();

    // Notify senior admins
    await NotificationService.createAdminNotification({
      type: 'warning',
      title: 'Appel escaladé à N2',
      message: `L'appel #${appealId} nécessite une revue N2`,
      priority: 'urgent',
      link: `/admin/appeals/${appealId}`,
    });

    // Notify promoteur
    await NotificationService.createNotification({
      user: appeal.promoteur,
      type: 'info',
      title: 'Votre appel a été escaladé',
      message: 'Votre appel est maintenant examiné par un superviseur. Décision sous 7 jours.',
      priority: 'medium',
      link: `/appeals/${appealId}`,
    });

    return appeal;
  }

  /**
   * Resolve appeal
   */
  static async resolveAppeal(
    appealId: string,
    decidedBy: string,
    outcome: 'approved' | 'partially-approved' | 'rejected',
    explanation: string,
    newAction?: { type: string; details: string }
  ) {
    const appeal = await Appeal.findById(appealId);
    if (!appeal) throw new Error('Appeal not found');

    appeal.status = outcome === 'approved' ? 'approved' : 'rejected';
    appeal.resolvedAt = new Date();
    appeal.decision = {
      outcome,
      explanation,
      decidedBy: decidedBy as any,
      decidedAt: new Date(),
      newAction,
    };

    await appeal.save();

    // Apply changes based on outcome
    if (outcome === 'approved') {
      await this.applyApprovalChanges(appeal);
    } else if (outcome === 'partially-approved' && newAction) {
      await this.applyPartialApproval(appeal, newAction);
    }

    // Notify promoteur
    const notificationType = outcome === 'approved' ? 'success' : 'warning';
    await NotificationService.createNotification({
      user: appeal.promoteur,
      type: notificationType,
      title: `Appel ${outcome === 'approved' ? 'approuvé' : 'rejeté'}`,
      message: explanation,
      priority: 'high',
      link: `/appeals/${appealId}`,
    });

    // Audit log
    await AuditLogService.log({
      actor: decidedBy,
      actorRole: 'admin',
      action: 'appeal-resolved',
      category: 'appeal',
      targetType: 'Appeal',
      targetId: appealId,
      description: `Appeal ${outcome}: ${explanation}`,
      metadata: { outcome, explanation, newAction },
    });

    return appeal;
  }

  /**
   * Apply approval changes (remove sanctions, etc.)
   */
  private static async applyApprovalChanges(appeal: any) {
    const promoteur = await Promoteur.findById(appeal.promoteur);
    if (!promoteur) return;

    // Remove the restriction that was appealed
    const originalActionType = appeal.originalAction.type;
    
    promoteur.restrictions = promoteur.restrictions.filter(
      (r: any) => r.type !== originalActionType || 
                  r.appliedAt.getTime() !== appeal.originalAction.appliedAt.getTime()
    );

    // If was suspended, reactivate
    if (promoteur.subscriptionStatus === 'suspended') {
      promoteur.subscriptionStatus = 'active';
    }

    await promoteur.save();
  }

  /**
   * Apply partial approval (replace with lighter sanction)
   */
  private static async applyPartialApproval(appeal: any, newAction: any) {
    const promoteur = await Promoteur.findById(appeal.promoteur);
    if (!promoteur) return;

    // Remove original sanction
    const originalActionType = appeal.originalAction.type;
    promoteur.restrictions = promoteur.restrictions.filter(
      (r: any) => r.type !== originalActionType ||
                  r.appliedAt.getTime() !== appeal.originalAction.appliedAt.getTime()
    );

    // Add new lighter sanction
    promoteur.restrictions.push({
      type: newAction.type,
      reason: newAction.details,
      appliedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    } as any);

    await promoteur.save();
  }

  /**
   * Check for overdue appeals
   */
  static async checkOverdueAppeals() {
    const overdueAppeals = await Appeal.find({
      status: { $in: ['pending', 'under-review', 'escalated'] },
      deadline: { $lt: new Date() },
    });

    for (const appeal of overdueAppeals) {
      // Auto-escalate N1 to N2 if overdue
      if (appeal.level === 1 && !appeal.escalated) {
        await this.escalateToN2(
          appeal._id.toString(),
          'system',
          'Deadline N1 dépassé - escalade automatique'
        );
      } else {
        // Send urgent notification
        await NotificationService.createAdminNotification({
          type: 'error',
          title: 'Appel en retard',
          message: `L'appel #${appeal._id} a dépassé sa deadline`,
          priority: 'urgent',
          link: `/admin/appeals/${appeal._id}`,
        });
      }
    }

    return overdueAppeals;
  }

  /**
   * Get appeal statistics
   */
  static async getAppealStats(timeframe: 'week' | 'month' | 'year' = 'month') {
    const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 365;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const appeals = await Appeal.find({
      submittedAt: { $gte: cutoff },
    });

    const total = appeals.length;
    const pending = appeals.filter(a => a.status === 'pending').length;
    const approved = appeals.filter(a => a.status === 'approved').length;
    const rejected = appeals.filter(a => a.status === 'rejected').length;
    const escalated = appeals.filter(a => a.escalated).length;

    const avgResolutionTime = appeals
      .filter(a => a.resolvedAt)
      .reduce((sum, a) => {
        const time = a.resolvedAt!.getTime() - a.submittedAt.getTime();
        return sum + time / (1000 * 60 * 60); // hours
      }, 0) / (approved + rejected || 1);

    return {
      total,
      pending,
      approved,
      rejected,
      escalated,
      approvalRate: total > 0 ? ((approved / total) * 100).toFixed(1) : '0',
      avgResolutionTime: avgResolutionTime.toFixed(1),
    };
  }
}
