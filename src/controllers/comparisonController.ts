import { Request, Response } from 'express';
import { ComparisonService } from '../services/ComparisonService';

export class ComparisonController {
  /**
   * Create a new comparison
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { projectIds, notes } = req.body;

      const comparison = await ComparisonService.createComparison({
        userId,
        projectIds,
        notes,
      });

      res.status(201).json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get comparison by ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const comparison = await ComparisonService.getComparison(id, userId);

      // Get insights
      const insights = ComparisonService.getComparisonInsights(comparison);
      const winner = ComparisonService.getOverallWinner(comparison);

      res.json({
        success: true,
        data: {
          ...comparison.toObject(),
          insights,
          winner,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get comparison by share token
   */
  static async getByToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      const comparison = await ComparisonService.getComparisonByToken(token);

      // Get insights
      const insights = ComparisonService.getComparisonInsights(comparison);
      const winner = ComparisonService.getOverallWinner(comparison);

      res.json({
        success: true,
        data: {
          ...comparison.toObject(),
          insights,
          winner,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get user's comparisons
   */
  static async getMyComparisons(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const comparisons = await ComparisonService.getUserComparisons(userId, limit);

      res.json({
        success: true,
        data: comparisons,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Share comparison
   */
  static async share(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const { sharedWithUserIds } = req.body;

      const result = await ComparisonService.shareComparison(id, userId, sharedWithUserIds);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Record decision
   */
  static async recordDecision(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const { selectedProjectId, reason } = req.body;

      const comparison = await ComparisonService.recordDecision(id, userId, selectedProjectId, reason);

      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete comparison
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      await ComparisonService.deleteComparison(id, userId);

      res.json({
        success: true,
        message: 'Comparison deleted',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
