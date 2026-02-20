import { Request, Response } from 'express';
import Badge from '../models/Badge';
import Promoteur from '../models/Promoteur';
import { BadgeService } from '../services/BadgeService';
import { Role } from '../config/roles';

export class BadgeController {
  /**
   * Get all badges
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { category, isActive } = req.query;

      const query: any = {};
      if (category) query.category = category;
      if (isActive !== undefined) query.isActive = isActive === 'true';

      const badges = await Badge.find(query).sort({ priority: 1, name: 1 });

      res.json({
        success: true,
        data: badges,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get badge by ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const badge = await Badge.findById(id);

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
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Create badge (admin)
   */
  static async create(req: Request, res: Response) {
    try {
      const badge = new Badge(req.body);
      await badge.save();

      res.status(201).json({
        success: true,
        data: badge,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update badge (admin)
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const badge = await Badge.findByIdAndUpdate(id, req.body, { new: true });

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
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete badge (admin)
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const badge = await Badge.findByIdAndUpdate(id, { isActive: false }, { new: true });

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
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Check and award badges for a promoteur (admin/cron)
   */
  static async checkAndAward(req: Request, res: Response) {
    try {
      const { promoteurId } = req.params;

      await BadgeService.checkAndAwardBadges(promoteurId);

      res.json({
        success: true,
        message: 'Badges checked and awarded',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Initialize default badges (admin)
   */
  static async initializeDefaults(req: Request, res: Response) {
    try {
      await BadgeService.initializeDefaultBadges();

      res.json({
        success: true,
        message: 'Default badges initialized',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Assign badge to promoteur (admin)
   */
  static async assignBadge(req: Request, res: Response) {
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

      const promoteur = await Promoteur.findById(promoteurId);
      if (!promoteur) {
        console.error('[assignBadge] Promoteur not found:', promoteurId);
        return res.status(404).json({
          success: false,
          error: 'Promoteur not found',
        });
      }

      const badge = await Badge.findById(badgeId);
      if (!badge) {
        console.error('[assignBadge] Badge not found:', badgeId);
        return res.status(404).json({
          success: false,
          error: 'Badge not found',
        });
      }

      // Check if already has badge
      const hasBadge = promoteur.badges.some(
        (b: any) => b.badgeId.toString() === badgeId
      );

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
        badgeId: badge._id as any,
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
    } catch (error: any) {
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
  static async revokeBadge(req: Request, res: Response) {
    try {
      const { promoteurId, badgeId } = req.body;

      if (!promoteurId || !badgeId) {
        return res.status(400).json({
          success: false,
          error: 'promoteurId and badgeId are required',
        });
      }

      const promoteur = await Promoteur.findById(promoteurId);
      if (!promoteur) {
        return res.status(404).json({
          success: false,
          error: 'Promoteur not found',
        });
      }

      const badge = await Badge.findById(badgeId);
      if (!badge) {
        return res.status(404).json({
          success: false,
          error: 'Badge not found',
        });
      }

      const badgeIndex = promoteur.badges.findIndex(
        (b: any) => b.badgeId.toString() === badgeId
      );

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
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
