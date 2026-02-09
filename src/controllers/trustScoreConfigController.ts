import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { AdvancedTrustScoreService } from '../services/AdvancedTrustScoreService';
import TrustScoreConfig from '../models/TrustScoreConfig';

export class TrustScoreConfigController {
  /**
   * Get active config
   */
  static async getActiveConfig(req: AuthRequest, res: Response) {
    try {
      const config = await AdvancedTrustScoreService.getActiveConfig();

      res.json({ config });
    } catch (error) {
      console.error('Error getting active config:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get all configs
   */
  static async getAllConfigs(req: AuthRequest, res: Response) {
    try {
      const configs = await TrustScoreConfig.find()
        .sort({ createdAt: -1 });

      res.json({ configs });
    } catch (error) {
      console.error('Error getting configs:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get config by ID
   */
  static async getConfig(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const config = await TrustScoreConfig.findById(id);

      if (!config) {
        return res.status(404).json({ message: 'Config not found' });
      }

      res.json({ config });
    } catch (error) {
      console.error('Error getting config:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Create or update config
   */
  static async saveConfig(req: AuthRequest, res: Response) {
    try {
      const { name, setActive, ...configData } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Config name is required' });
      }

      const config = await AdvancedTrustScoreService.saveConfig(
        name,
        configData,
        req.user!.id,
        setActive
      );

      res.json({ config });
    } catch (error) {
      console.error('Error saving config:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Activate config
   */
  static async activateConfig(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Deactivate all
      await TrustScoreConfig.updateMany({}, { isActive: false });

      // Activate this one
      const config = await TrustScoreConfig.findByIdAndUpdate(
        id,
        { isActive: true },
        { new: true }
      );

      if (!config) {
        return res.status(404).json({ message: 'Config not found' });
      }

      res.json({ config });
    } catch (error) {
      console.error('Error activating config:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Delete config
   */
  static async deleteConfig(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const config = await TrustScoreConfig.findById(id);
      
      if (!config) {
        return res.status(404).json({ message: 'Config not found' });
      }

      if (config.isActive) {
        return res.status(400).json({ message: 'Cannot delete active config' });
      }

      await TrustScoreConfig.findByIdAndDelete(id);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting config:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Calculate score for a promoteur
   */
  static async calculateScore(req: AuthRequest, res: Response) {
    try {
      const { promoteurId } = req.params;

      const result = await AdvancedTrustScoreService.calculateScore(promoteurId);

      res.json(result);
    } catch (error: any) {
      console.error('Error calculating score:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }

  /**
   * Recalculate all scores
   */
  static async recalculateAllScores(req: AuthRequest, res: Response) {
    try {
      const count = await AdvancedTrustScoreService.recalculateAllScores();

      res.json({ updated: count });
    } catch (error) {
      console.error('Error recalculating scores:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get score history
   */
  static async getScoreHistory(req: AuthRequest, res: Response) {
    try {
      const { promoteurId } = req.params;
      const { days } = req.query;

      const history = await AdvancedTrustScoreService.getScoreHistory(
        promoteurId,
        days ? parseInt(days as string) : 30
      );

      res.json({ history });
    } catch (error) {
      console.error('Error getting score history:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
