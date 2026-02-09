import { Request, Response } from 'express';
import Favorite from '../models/Favorite';
import Project from '../models/Project';

export class FavoriteController {
  /**
   * Add project to favorites
   */
  static async add(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { projectId } = req.body;

      // Check if already favorited
      const existing = await Favorite.findOne({ user: userId, project: projectId });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Project already in favorites',
        });
      }

      const favorite = new Favorite({
        user: userId,
        project: projectId,
      });

      await favorite.save();

      // Increment project favorites count
      await Project.findByIdAndUpdate(projectId, { $inc: { favorites: 1 } });

      res.status(201).json({
        success: true,
        data: favorite,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Remove from favorites
   */
  static async remove(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { projectId } = req.params;

      const favorite = await Favorite.findOneAndDelete({ user: userId, project: projectId });

      if (!favorite) {
        return res.status(404).json({
          success: false,
          error: 'Favorite not found',
        });
      }

      // Decrement project favorites count
      await Project.findByIdAndUpdate(projectId, { $inc: { favorites: -1 } });

      res.json({
        success: true,
        message: 'Removed from favorites',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get user's favorites
   */
  static async getMyFavorites(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const favorites = await Favorite.find({ user: userId })
        .populate({
          path: 'project',
          populate: {
            path: 'promoteur',
            select: 'organizationName trustScore badges',
          },
        })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: favorites,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Check if project is favorited
   */
  static async checkFavorite(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { projectId } = req.params;

      const favorite = await Favorite.findOne({ user: userId, project: projectId });

      res.json({
        success: true,
        data: { isFavorite: !!favorite },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Add note to favorite
   */
  static async addNote(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { projectId } = req.params;
      const { note } = req.body;

      const favorite = await Favorite.findOne({ user: userId, project: projectId });

      if (!favorite) {
        return res.status(404).json({
          success: false,
          error: 'Favorite not found',
        });
      }

      favorite.notes = note;
      await favorite.save();

      res.json({
        success: true,
        data: favorite,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
