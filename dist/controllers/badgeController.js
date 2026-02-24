"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadgeController = void 0;
const Badge_1 = __importDefault(require("../models/Badge"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const BadgeService_1 = require("../services/BadgeService");
class BadgeController {
    /**
     * Get all badges
     */
    static async getAll(req, res) {
        try {
            const { category, isActive } = req.query;
            const query = {};
            if (category)
                query.category = category;
            if (isActive !== undefined)
                query.isActive = isActive === 'true';
            const badges = await Badge_1.default.find(query).sort({ priority: 1, name: 1 });
            res.json({
                success: true,
                data: badges,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get badge by ID
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const badge = await Badge_1.default.findById(id);
            if (!badge) {
                return res.status(404).json({
                    success: false,
                    error: 'Badge not found',
                });
            }
            res.json({
                success: true,
                data: badge,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Create badge (admin)
     */
    static async create(req, res) {
        try {
            const badge = new Badge_1.default(req.body);
            await badge.save();
            res.status(201).json({
                success: true,
                data: badge,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Update badge (admin)
     */
    static async update(req, res) {
        try {
            const { id } = req.params;
            const badge = await Badge_1.default.findByIdAndUpdate(id, req.body, { new: true });
            if (!badge) {
                return res.status(404).json({
                    success: false,
                    error: 'Badge not found',
                });
            }
            res.json({
                success: true,
                data: badge,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Delete badge (admin)
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const badge = await Badge_1.default.findByIdAndUpdate(id, { isActive: false }, { new: true });
            if (!badge) {
                return res.status(404).json({
                    success: false,
                    error: 'Badge not found',
                });
            }
            res.json({
                success: true,
                message: 'Badge deactivated',
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Check and award badges for a promoteur (admin/cron)
     */
    static async checkAndAward(req, res) {
        try {
            const { promoteurId } = req.params;
            await BadgeService_1.BadgeService.checkAndAwardBadges(promoteurId);
            res.json({
                success: true,
                message: 'Badges checked and awarded',
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Initialize default badges (admin)
     */
    static async initializeDefaults(req, res) {
        try {
            await BadgeService_1.BadgeService.initializeDefaultBadges();
            res.json({
                success: true,
                message: 'Default badges initialized',
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Assign badge to promoteur (admin)
     */
    static async assignBadge(req, res) {
        try {
            // Log du corps reçu
            console.log('[assignBadge] req.body:', req.body);
            const { promoteurId, badgeId } = req.body;
            if (!promoteurId || !badgeId) {
                console.error('[assignBadge] Missing promoteurId or badgeId');
                return res.status(400).json({
                    success: false,
                    error: 'promoteurId and badgeId are required',
                });
            }
            const promoteur = await Promoteur_1.default.findById(promoteurId);
            if (!promoteur) {
                console.error('[assignBadge] Promoteur not found:', promoteurId);
                return res.status(404).json({
                    success: false,
                    error: 'Promoteur not found',
                });
            }
            const badge = await Badge_1.default.findById(badgeId);
            if (!badge) {
                console.error('[assignBadge] Badge not found:', badgeId);
                return res.status(404).json({
                    success: false,
                    error: 'Badge not found',
                });
            }
            // Check if already has badge
            const hasBadge = promoteur.badges.some((b) => b.badgeId.toString() === badgeId);
            if (hasBadge) {
                console.error('[assignBadge] Promoteur already has this badge:', badgeId);
                return res.status(400).json({
                    success: false,
                    error: 'Promoteur already has this badge',
                });
            }
            const expiresAt = badge.hasExpiration && badge.expirationDays
                ? new Date(Date.now() + badge.expirationDays * 24 * 60 * 60 * 1000)
                : undefined;
            promoteur.badges.push({
                badgeId: badge._id,
                earnedAt: new Date(),
                expiresAt,
            });
            badge.activeCount += 1;
            badge.totalEarned += 1;
            await promoteur.save();
            await badge.save();
            res.json({
                success: true,
                message: 'Badge assigned',
                data: promoteur,
            });
        }
        catch (error) {
            console.error('[assignBadge] Exception:', error);
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Revoke badge from promoteur (admin)
     */
    static async revokeBadge(req, res) {
        try {
            const { promoteurId, badgeId } = req.body;
            if (!promoteurId || !badgeId) {
                return res.status(400).json({
                    success: false,
                    error: 'promoteurId and badgeId are required',
                });
            }
            const promoteur = await Promoteur_1.default.findById(promoteurId);
            if (!promoteur) {
                return res.status(404).json({
                    success: false,
                    error: 'Promoteur not found',
                });
            }
            const badge = await Badge_1.default.findById(badgeId);
            if (!badge) {
                return res.status(404).json({
                    success: false,
                    error: 'Badge not found',
                });
            }
            const badgeIndex = promoteur.badges.findIndex((b) => b.badgeId.toString() === badgeId);
            if (badgeIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Badge not found on promoteur',
                });
            }
            promoteur.badges.splice(badgeIndex, 1);
            badge.activeCount = Math.max(0, badge.activeCount - 1);
            await promoteur.save();
            await badge.save();
            res.json({
                success: true,
                message: 'Badge revoked',
                data: promoteur,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
}
exports.BadgeController = BadgeController;
