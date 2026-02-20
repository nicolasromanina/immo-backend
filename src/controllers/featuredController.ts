import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { FeaturedService } from '../services/FeaturedService';

export class FeaturedController {
  /**
   * Get featured items for a placement
   */
  static async getFeaturedItems(req: AuthRequest, res: Response) {
    try {
      const { placement } = req.params;
      const { country, city, category, limit } = req.query;

      const items = await FeaturedService.getFeaturedItems(
        placement as any,
        {
          country: country as string,
          city: city as string,
          category: category as string,
          limit: limit ? parseInt(limit as string) : 10,
        }
      );

      res.json({ items });
    } catch (error) {
      console.error('Error getting featured items:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get top verified projects
   */
  static async getTopVerifiedProjects(req: AuthRequest, res: Response) {
    try {
      const { country, city, limit } = req.query;

      const projects = await FeaturedService.getTopVerifiedProjects({
        country: country as string,
        city: city as string,
        limit: limit ? parseInt(limit as string) : 10,
      });

      res.json({ projects });
    } catch (error) {
      console.error('Error getting top verified projects:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get new projects
   */
  static async getNewProjects(req: AuthRequest, res: Response) {
    try {
      const { country, city, limit, days } = req.query;

      const projects = await FeaturedService.getNewProjects({
        country: country as string,
        city: city as string,
        limit: limit ? parseInt(limit as string) : 10,
        days: days ? parseInt(days as string) : 30,
      });

      res.json({ projects });
    } catch (error) {
      console.error('Error getting new projects:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Track click on featured item
   */
  static async trackClick(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await FeaturedService.trackClick(id);

      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking click:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Admin endpoints

  /**
   * Create featured slot (admin)
   */
  static async createFeaturedSlot(req: AuthRequest, res: Response) {
    try {
      console.debug('[FEATURED][CTRL] createFeaturedSlot request', { body: req.body, user: req.user?.id });
      const slot = await FeaturedService.createFeaturedSlot({
        ...req.body,
        createdBy: req.user!.id,
      });
      console.debug('[FEATURED][CTRL] createFeaturedSlot created', { slotId: slot?._id });

      res.status(201).json({ slot });
    } catch (error) {
      console.error('[FEATURED][CTRL] Error creating featured slot:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Cancel featured slot (admin)
   */
  static async cancelFeaturedSlot(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      console.debug('[FEATURED][CTRL] cancelFeaturedSlot request', { id, user: req.user?.id });

      const slot = await FeaturedService.cancelFeaturedSlot(id);
      console.debug('[FEATURED][CTRL] cancelFeaturedSlot result', { slotId: slot?._id });

      if (!slot) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      res.json({ slot });
    } catch (error) {
      console.error('Error canceling featured slot:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get all slots (admin)
   */
  static async getAllSlots(req: AuthRequest, res: Response) {
    try {
      const { placement, status, entityType, page, limit } = req.query;
      // Mask Authorization header for logs
      const authHeader = req.headers.authorization as string | undefined;
      const mask = (s?: string) => (s && s.length > 12 ? `${s.slice(0,6)}...${s.slice(-6)}` : s);
      console.debug('[FEATURED][CTRL] getAllSlots query', { placement, status, entityType, page, limit, user: req.user?.id, auth: mask(authHeader) });

      const result = await FeaturedService.getAllSlots({
        placement: placement as string,
        status: status as string,
        entityType: entityType as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      // Log a concise summary of the result
      try {
        const slotsCount = Array.isArray((result as any).slots) ? (result as any).slots.length : 0;
        const total = (result as any).total ?? (result as any).pagination?.total;
        console.debug('[FEATURED][CTRL] getAllSlots result', { slotsCount, total });
      } catch (e) {
        console.debug('[FEATURED][CTRL] getAllSlots result (unable to summarize)', { error: (e as Error).message });
      }

      res.json(result);
    } catch (error) {
      console.error('Error getting slots:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get slot performance (admin)
   */
  static async getSlotPerformance(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      console.debug('[FEATURED][CTRL] getSlotPerformance request', { id, user: req.user?.id });

      const performance = await FeaturedService.getSlotPerformance(id);
      console.debug('[FEATURED][CTRL] getSlotPerformance response', { id, performance });

      if (!performance) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      res.json(performance);
    } catch (error) {
      console.error('Error getting slot performance:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Approve slot (admin)
   */
  static async approveSlot(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      console.debug('[FEATURED][CTRL] approveSlot request', { id, user: req.user?.id });

      const slot = await FeaturedService.approveSlot(id);
      console.debug('[FEATURED][CTRL] approveSlot result', { slotId: slot?._id });
      if (!slot) return res.status(404).json({ message: 'Slot not found' });

      res.json({ slot });
    } catch (error) {
      console.error('[FEATURED][CTRL] Error approving slot:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Reject slot (admin)
   */
  static async rejectSlot(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      console.debug('[FEATURED][CTRL] rejectSlot request', { id, reason, user: req.user?.id });

      const slot = await FeaturedService.rejectSlot(id, reason);
      console.debug('[FEATURED][CTRL] rejectSlot result', { slotId: slot?._id });
      if (!slot) return res.status(404).json({ message: 'Slot not found' });

      res.json({ slot });
    } catch (error) {
      console.error('[FEATURED][CTRL] Error rejecting slot:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update slot (admin)
   */
  static async updateSlot(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      console.debug('[FEATURED][CTRL] updateSlot request', { id, data, user: req.user?.id });

      const slot = await FeaturedService.updateSlot(id, data);
      console.debug('[FEATURED][CTRL] updateSlot result', { slotId: slot?._id });
      if (!slot) return res.status(404).json({ message: 'Slot not found' });

      res.json({ slot });
    } catch (error) {
      console.error('[FEATURED][CTRL] Error updating slot:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Run auto-feature job (admin)
   */
  static async runAutoFeature(req: AuthRequest, res: Response) {
    try {
      console.debug('[FEATURED][CTRL] runAutoFeature request', { user: req.user?.id });
      const count = await FeaturedService.autoFeatureTopProjects();
      console.debug('[FEATURED][CTRL] runAutoFeature result', { featuredCount: count });

      res.json({ featuredCount: count });
    } catch (error) {
      console.error('[FEATURED][CTRL] Error running auto-feature:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
