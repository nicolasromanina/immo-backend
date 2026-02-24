"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadgeService = void 0;
const Badge_1 = __importDefault(require("../models/Badge"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const NotificationService_1 = require("./NotificationService");
const TrustScoreService_1 = require("./TrustScoreService");
class BadgeService {
    /**
     * Initialize default badges
     */
    static async initializeDefaultBadges() {
        const defaultBadges = [
            {
                name: 'Identité Vérifiée',
                slug: 'identite-verifiee',
                description: 'Identité et documents de société vérifiés',
                icon: 'shield-check',
                category: 'verification',
                criteria: { type: 'auto', rules: [{ field: 'kycStatus', operator: 'equals', value: 'verified' }] },
                trustScoreBonus: 5,
                hasExpiration: false,
                isActive: true,
                isPublic: true,
                priority: 1,
            },
            {
                name: 'Avancement Régulier',
                slug: 'avancement-regulier',
                description: 'Publie des mises à jour régulièrement',
                icon: 'clock-check',
                category: 'performance',
                criteria: { type: 'auto' },
                trustScoreBonus: 3,
                hasExpiration: true,
                expirationDays: 60,
                isActive: true,
                isPublic: true,
                priority: 2,
            },
            {
                name: 'Réponse Rapide',
                slug: 'reponse-rapide',
                description: 'Répond aux leads en moins de 6 heures',
                icon: 'message-fast',
                category: 'performance',
                criteria: { type: 'auto', rules: [{ field: 'averageResponseTime', operator: 'lte', value: 6 }] },
                trustScoreBonus: 2,
                hasExpiration: true,
                expirationDays: 30,
                isActive: true,
                isPublic: true,
                priority: 3,
            },
            {
                name: 'Top Verified',
                slug: 'top-verified',
                description: 'Promoteur de confiance avec score excellent',
                icon: 'star',
                category: 'trust',
                criteria: { type: 'auto', rules: [{ field: 'trustScore', operator: 'gte', value: 85 }] },
                trustScoreBonus: 5,
                hasExpiration: true,
                expirationDays: 90,
                isActive: true,
                isPublic: true,
                priority: 0,
            },
            {
                name: 'Agréé',
                slug: 'agree',
                description: 'Dispose d\'un agrément officiel',
                icon: 'certificate',
                category: 'verification',
                criteria: { type: 'auto', rules: [{ field: 'hasAgrement', operator: 'equals', value: true }] },
                trustScoreBonus: 3,
                hasExpiration: false,
                isActive: true,
                isPublic: true,
                priority: 1,
            },
            {
                name: 'Premier Projet',
                slug: 'premier-projet',
                description: 'A publié son premier projet',
                icon: 'rocket',
                category: 'engagement',
                criteria: { type: 'auto' },
                trustScoreBonus: 1,
                hasExpiration: false,
                isActive: true,
                isPublic: true,
                priority: 5,
            },
            {
                name: 'Vétéran',
                slug: 'veteran',
                description: 'Plus de 5 projets réalisés',
                icon: 'medal',
                category: 'special',
                criteria: { type: 'auto', rules: [{ field: 'completedProjects', operator: 'gte', value: 5 }] },
                trustScoreBonus: 4,
                hasExpiration: false,
                isActive: true,
                isPublic: true,
                priority: 1,
            },
        ];
        for (const badgeData of defaultBadges) {
            const existing = await Badge_1.default.findOne({ slug: badgeData.slug });
            if (!existing) {
                await Badge_1.default.create(badgeData);
            }
        }
    }
    /**
     * Check and award badges to a promoteur
     */
    static async checkAndAwardBadges(promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return;
        const allBadges = await Badge_1.default.find({ isActive: true });
        const newBadgesAwarded = [];
        for (const badge of allBadges) {
            // Check if promoteur already has this badge
            const hasBadge = promoteur.badges.some((b) => b.badgeId.toString() === badge._id.toString());
            if (hasBadge)
                continue; // Already has badge
            // Check if criteria is met
            const criteriasMet = await this.checkBadgeCriteria(promoteur, badge);
            if (criteriasMet) {
                // Award badge
                const expiresAt = badge.hasExpiration && badge.expirationDays
                    ? new Date(Date.now() + badge.expirationDays * 24 * 60 * 60 * 1000)
                    : undefined;
                promoteur.badges.push({
                    badgeId: badge._id,
                    earnedAt: new Date(),
                    expiresAt,
                });
                badge.totalEarned += 1;
                badge.activeCount += 1;
                await badge.save();
                newBadgesAwarded.push(badge);
                // Send notification
                const user = await Promoteur_1.default.findById(promoteurId).populate('user');
                if (user?.user) {
                    await NotificationService_1.NotificationService.notifyBadgeEarned({
                        userId: user.user._id.toString(),
                        badgeName: badge.name,
                        badgeDescription: badge.description,
                    });
                }
            }
        }
        await promoteur.save();
        // Recalculate trust score if badges were awarded
        if (newBadgesAwarded.length > 0) {
            await TrustScoreService_1.TrustScoreService.updateAllScores(promoteurId);
        }
        return newBadgesAwarded;
    }
    /**
     * Check if badge criteria is met
     */
    static async checkBadgeCriteria(promoteur, badge) {
        if (!badge.criteria || !badge.criteria.rules)
            return false;
        for (const rule of badge.criteria.rules) {
            const value = this.getNestedValue(promoteur, rule.field);
            switch (rule.operator) {
                case 'equals':
                    if (value !== rule.value)
                        return false;
                    break;
                case 'gte':
                    if (value < rule.value)
                        return false;
                    break;
                case 'lte':
                    if (value > rule.value)
                        return false;
                    break;
                case 'gt':
                    if (value <= rule.value)
                        return false;
                    break;
                case 'lt':
                    if (value >= rule.value)
                        return false;
                    break;
                default:
                    return false;
            }
        }
        return true;
    }
    /**
     * Get nested object value by path
     */
    static getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    /**
     * Remove badge from promoteur
     */
    static async removeBadge(promoteurId, badgeId, reason) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            throw new Error('Promoteur not found');
        const badgeIndex = promoteur.badges.findIndex((b) => b.badgeId.toString() === badgeId);
        if (badgeIndex === -1)
            throw new Error('Badge not found on promoteur');
        promoteur.badges.splice(badgeIndex, 1);
        await promoteur.save();
        const badge = await Badge_1.default.findById(badgeId);
        if (badge) {
            badge.activeCount = Math.max(0, badge.activeCount - 1);
            await badge.save();
        }
        // Recalculate trust score
        await TrustScoreService_1.TrustScoreService.updateAllScores(promoteurId);
        return { success: true, reason };
    }
    /**
     * Remove badge if it exists (no error if not found)
     */
    static async removeBadgeIfExists(promoteurId, badgeSlug) {
        try {
            const promoteur = await Promoteur_1.default.findById(promoteurId);
            if (!promoteur)
                return;
            const badge = await Badge_1.default.findOne({ slug: badgeSlug });
            if (!badge)
                return;
            const badgeIndex = promoteur.badges.findIndex((b) => b.badgeId.toString() === badge._id.toString());
            if (badgeIndex === -1)
                return; // Badge not found, that's ok
            promoteur.badges.splice(badgeIndex, 1);
            await promoteur.save();
            badge.activeCount = Math.max(0, badge.activeCount - 1);
            await badge.save();
            // Recalculate trust score
            await TrustScoreService_1.TrustScoreService.updateAllScores(promoteurId);
        }
        catch (error) {
            console.error('Error removing badge:', error);
            // Don't throw - removing badge should not break main flow
        }
    }
    /**
     * Check for expired badges and remove them
     */
    static async checkExpiredBadges() {
        const promoteurs = await Promoteur_1.default.find({ 'badges.0': { $exists: true } });
        let totalRemoved = 0;
        for (const promoteur of promoteurs) {
            let hasChanges = false;
            const now = new Date();
            promoteur.badges = promoteur.badges.filter((badge) => {
                if (badge.expiresAt && badge.expiresAt < now) {
                    hasChanges = true;
                    totalRemoved++;
                    return false;
                }
                return true;
            });
            if (hasChanges) {
                await promoteur.save();
                await TrustScoreService_1.TrustScoreService.updateAllScores(promoteur._id.toString());
            }
        }
        return { totalRemoved };
    }
    /**
     * Get all badges
     */
    static async getAllBadges(filter) {
        const query = {};
        if (filter?.category)
            query.category = filter.category;
        if (filter?.isActive !== undefined)
            query.isActive = filter.isActive;
        return Badge_1.default.find(query).sort({ priority: 1, name: 1 });
    }
}
exports.BadgeService = BadgeService;
