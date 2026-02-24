"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppealProcessingService = void 0;
const Appeal_1 = __importDefault(require("../models/Appeal"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const AuditLogService_1 = require("./AuditLogService");
const NotificationService_1 = require("./NotificationService");
/**
 * Service for processing appeals (N1 and N2)
 * Implements the appeal workflow with deadlines
 */
class AppealProcessingService {
    /**
     * Create a new appeal
     */
    static async createAppeal(params) {
        const appeal = new Appeal_1.default({
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
        await NotificationService_1.NotificationService.createAdminNotification({
            type: 'info',
            title: 'Nouvel appel reçu',
            message: `Appel ${appeal.type} de ${params.promoteurId}`,
            priority: 'high',
            link: `/admin/appeals/${appeal._id}`,
        });
        // Audit log
        await AuditLogService_1.AuditLogService.log({
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
    static async assignAppeal(appealId, reviewerId) {
        const appeal = await Appeal_1.default.findById(appealId);
        if (!appeal)
            throw new Error('Appeal not found');
        appeal.assignedTo = reviewerId;
        appeal.status = 'under-review';
        appeal.reviewStartedAt = new Date();
        await appeal.save();
        // Notify reviewer
        await NotificationService_1.NotificationService.createNotification({
            user: reviewerId,
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
    static async addReviewNote(appealId, userId, note, isInternal = true) {
        const appeal = await Appeal_1.default.findById(appealId);
        if (!appeal)
            throw new Error('Appeal not found');
        appeal.reviewNotes.push({
            note,
            addedBy: userId,
            addedAt: new Date(),
            isInternal,
        });
        await appeal.save();
        // If not internal, notify promoteur
        if (!isInternal) {
            await NotificationService_1.NotificationService.createNotification({
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
    static async escalateToN2(appealId, escalatedBy, escalationReason) {
        const appeal = await Appeal_1.default.findById(appealId);
        if (!appeal)
            throw new Error('Appeal not found');
        if (appeal.level !== 1) {
            throw new Error('Appeal can only be escalated from N1');
        }
        appeal.level = 2;
        appeal.status = 'escalated';
        appeal.escalated = true;
        appeal.escalationReason = escalationReason;
        appeal.escalatedAt = new Date();
        appeal.escalatedBy = escalatedBy;
        appeal.deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for N2
        appeal.assignedTo = undefined; // Reassign at N2
        await appeal.save();
        // Notify senior admins
        await NotificationService_1.NotificationService.createAdminNotification({
            type: 'warning',
            title: 'Appel escaladé à N2',
            message: `L'appel #${appealId} nécessite une revue N2`,
            priority: 'urgent',
            link: `/admin/appeals/${appealId}`,
        });
        // Notify promoteur
        await NotificationService_1.NotificationService.createNotification({
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
    static async resolveAppeal(appealId, decidedBy, outcome, explanation, newAction) {
        const appeal = await Appeal_1.default.findById(appealId);
        if (!appeal)
            throw new Error('Appeal not found');
        appeal.status = outcome === 'approved' ? 'approved' : 'rejected';
        appeal.resolvedAt = new Date();
        appeal.decision = {
            outcome,
            explanation,
            decidedBy: decidedBy,
            decidedAt: new Date(),
            newAction,
        };
        await appeal.save();
        // Apply changes based on outcome
        if (outcome === 'approved') {
            await this.applyApprovalChanges(appeal);
        }
        else if (outcome === 'partially-approved' && newAction) {
            await this.applyPartialApproval(appeal, newAction);
        }
        // Notify promoteur
        const notificationType = outcome === 'approved' ? 'success' : 'warning';
        await NotificationService_1.NotificationService.createNotification({
            user: appeal.promoteur,
            type: notificationType,
            title: `Appel ${outcome === 'approved' ? 'approuvé' : 'rejeté'}`,
            message: explanation,
            priority: 'high',
            link: `/appeals/${appealId}`,
        });
        // Audit log
        await AuditLogService_1.AuditLogService.log({
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
    static async applyApprovalChanges(appeal) {
        const promoteur = await Promoteur_1.default.findById(appeal.promoteur);
        if (!promoteur)
            return;
        // Remove the restriction that was appealed
        const originalActionType = appeal.originalAction.type;
        promoteur.restrictions = promoteur.restrictions.filter((r) => r.type !== originalActionType ||
            r.appliedAt.getTime() !== appeal.originalAction.appliedAt.getTime());
        // If was suspended, reactivate
        if (promoteur.subscriptionStatus === 'suspended') {
            promoteur.subscriptionStatus = 'active';
        }
        await promoteur.save();
    }
    /**
     * Apply partial approval (replace with lighter sanction)
     */
    static async applyPartialApproval(appeal, newAction) {
        const promoteur = await Promoteur_1.default.findById(appeal.promoteur);
        if (!promoteur)
            return;
        // Remove original sanction
        const originalActionType = appeal.originalAction.type;
        promoteur.restrictions = promoteur.restrictions.filter((r) => r.type !== originalActionType ||
            r.appliedAt.getTime() !== appeal.originalAction.appliedAt.getTime());
        // Add new lighter sanction
        promoteur.restrictions.push({
            type: newAction.type,
            reason: newAction.details,
            appliedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
        await promoteur.save();
    }
    /**
     * Check for overdue appeals
     */
    static async checkOverdueAppeals() {
        const overdueAppeals = await Appeal_1.default.find({
            status: { $in: ['pending', 'under-review', 'escalated'] },
            deadline: { $lt: new Date() },
        });
        for (const appeal of overdueAppeals) {
            // Auto-escalate N1 to N2 if overdue
            if (appeal.level === 1 && !appeal.escalated) {
                await this.escalateToN2(appeal._id.toString(), 'system', 'Deadline N1 dépassé - escalade automatique');
            }
            else {
                // Send urgent notification
                await NotificationService_1.NotificationService.createAdminNotification({
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
    static async getAppealStats(timeframe = 'month') {
        const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 365;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const appeals = await Appeal_1.default.find({
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
            const time = a.resolvedAt.getTime() - a.submittedAt.getTime();
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
exports.AppealProcessingService = AppealProcessingService;
