"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomatedSanctionsService = void 0;
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const Project_1 = __importDefault(require("../models/Project"));
const Update_1 = __importDefault(require("../models/Update"));
const AuditLogService_1 = require("./AuditLogService");
const NotificationService_1 = require("./NotificationService");
/**
 * Service for automated sanctions based on platform rules
 * Implements graduated sanctions system
 */
class AutomatedSanctionsService {
    /**
     * Check and apply sanctions for lack of updates
     */
    static async checkUpdateFrequency() {
        const projects = await Project_1.default.find({
            publicationStatus: 'published',
            status: { $in: ['demarrage-chantier', 'fondations', 'gros-oeuvres', 'second-oeuvres'] },
        }).populate('promoteur');
        const sanctions = [];
        for (const project of projects) {
            const lastUpdate = await Update_1.default.findOne({
                project: project._id,
                status: 'published',
            }).sort({ publishedAt: -1 });
            if (!lastUpdate) {
                // No updates at all
                const daysSincePublication = Math.floor((Date.now() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                if (daysSincePublication > 60) {
                    // 60 days without any update = warning
                    await this.applyWarning(project.promoteur, project._id, 'Aucune mise à jour depuis 60 jours', 'no-updates-60days');
                    sanctions.push({ project: project._id, sanction: 'warning', reason: 'no-updates-60days' });
                }
            }
            else {
                const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.publishedAt.getTime()) / (1000 * 60 * 60 * 24));
                if (daysSinceUpdate > 90) {
                    // 90 days without update = suspension
                    await this.applySuspension(project.promoteur, project._id, 'Aucune mise à jour depuis 90 jours', 30 // 30 days suspension
                    );
                    sanctions.push({ project: project._id, sanction: 'suspension', reason: 'no-updates-90days' });
                }
                else if (daysSinceUpdate > 60) {
                    // 60 days without update = restriction
                    await this.applyRestriction(project.promoteur, project._id, 'Aucune mise à jour depuis 60 jours', 'reduced-visibility');
                    sanctions.push({ project: project._id, sanction: 'restriction', reason: 'no-updates-60days' });
                }
                else if (daysSinceUpdate > 45) {
                    // 45 days without update = warning
                    await this.applyWarning(project.promoteur, project._id, 'Aucune mise à jour depuis 45 jours', 'no-updates-45days');
                    sanctions.push({ project: project._id, sanction: 'warning', reason: 'no-updates-45days' });
                }
            }
        }
        return sanctions;
    }
    /**
     * Apply a warning
     */
    static async applyWarning(promoteurId, projectId, reason, code) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return;
        // Check if warning already exists
        const existingWarning = promoteur.restrictions.find(r => r.type === 'warning' && r.reason.includes(code));
        if (existingWarning)
            return; // Already warned
        // Add warning
        promoteur.restrictions.push({
            type: 'warning',
            reason: `${reason} - ${code}`,
            appliedAt: new Date(),
        });
        await promoteur.save();
        // Send notification
        await NotificationService_1.NotificationService.createNotification({
            user: promoteur.user,
            type: 'warning',
            title: 'Avertissement',
            message: reason,
            priority: 'high',
            link: `/projects/${projectId}`,
        });
        // Audit log
        await AuditLogService_1.AuditLogService.log({
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
    static async applyRestriction(promoteurId, projectId, reason, restrictionType) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        promoteur.restrictions.push({
            type: restrictionType,
            reason,
            appliedAt: new Date(),
            expiresAt,
        });
        await promoteur.save();
        // Update project visibility
        if (restrictionType === 'reduced-visibility') {
            await Project_1.default.findByIdAndUpdate(projectId, {
                isFeatured: false,
            });
        }
        // Send notification
        await NotificationService_1.NotificationService.createNotification({
            user: promoteur.user,
            type: 'error',
            title: 'Restriction appliquée',
            message: `${reason}. Cette restriction expire dans 30 jours.`,
            priority: 'high',
            link: `/projects/${projectId}`,
        });
        // Audit log
        await AuditLogService_1.AuditLogService.log({
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
    static async applySuspension(promoteurId, projectId, reason, durationDays) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return;
        const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
        promoteur.subscriptionStatus = 'suspended';
        promoteur.restrictions.push({
            type: 'suspension',
            reason,
            appliedAt: new Date(),
            expiresAt,
        });
        await promoteur.save();
        // Suspend project
        await Project_1.default.findByIdAndUpdate(projectId, {
            status: 'suspended',
        });
        // Send notification
        await NotificationService_1.NotificationService.createNotification({
            user: promoteur.user,
            type: 'error',
            title: 'Compte suspendu',
            message: `Votre compte a été suspendu pour ${durationDays} jours. Raison: ${reason}`,
            priority: 'urgent',
            link: '/appeal',
        });
        // Audit log
        await AuditLogService_1.AuditLogService.log({
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
        const promoteurs = await Promoteur_1.default.find({
            'restrictions.expiresAt': { $lte: new Date() },
        });
        let count = 0;
        for (const promoteur of promoteurs) {
            const originalCount = promoteur.restrictions.length;
            promoteur.restrictions = promoteur.restrictions.filter((r) => !r.expiresAt || r.expiresAt > new Date());
            if (promoteur.restrictions.length < originalCount) {
                count += originalCount - promoteur.restrictions.length;
                // If suspension expired, reactivate
                if (promoteur.subscriptionStatus === 'suspended') {
                    promoteur.subscriptionStatus = 'active';
                }
                await promoteur.save();
                // Notify
                await NotificationService_1.NotificationService.createNotification({
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
    static async getSanctionHistory(promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return null;
        const activeRestrictions = promoteur.restrictions.filter((r) => !r.expiresAt || r.expiresAt > new Date());
        const expiredRestrictions = promoteur.restrictions.filter((r) => r.expiresAt && r.expiresAt <= new Date());
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
    static getSanctionLevel(activeCount) {
        if (activeCount === 0)
            return 'none';
        if (activeCount === 1)
            return 'warning';
        if (activeCount === 2)
            return 'restricted';
        return 'high-risk';
    }
}
exports.AutomatedSanctionsService = AutomatedSanctionsService;
/**
 * Sanction levels
 */
AutomatedSanctionsService.SANCTION_LEVELS = {
    warning: 1,
    restriction: 2,
    suspension: 3,
    ban: 4,
};
