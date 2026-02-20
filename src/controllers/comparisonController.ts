import { Request, Response } from 'express';
import { ComparisonService } from '../services/ComparisonService';
import Comparison from '../models/Comparison';

export class ComparisonController {
  /**
   * Create a new comparison
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { projectIds, notes } = req.body;

      // Debug incoming payload for diagnostics
      try {
        console.debug('[ComparisonController.create] user:', userId);
        console.debug('[ComparisonController.create] body.projectIds:', projectIds);
        if (Array.isArray(projectIds)) {
          console.debug('[ComparisonController.create] projectIds types:', projectIds.map((p: any) => typeof p));
          console.debug('[ComparisonController.create] projectIds length:', projectIds.length);
        }
      } catch (e) {
        console.debug('[ComparisonController.create] failed to log payload', e);
      }

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
   * Admin: get all comparisons (for moderation / admin dashboard)
   */
  static async getAll(req: Request, res: Response) {
    try {
      console.debug('[ComparisonController.getAll] query:', req.query);
      const {
        page = 1,
        limit = 20,
        projectId,
        userId,
        dateFrom,
        dateTo,
        promoteurId,
        sortBy = 'createdAt',
        sortDir = 'desc',
      } = req.query as any;

      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 20;
      const skip = (pageNum - 1) * limitNum;

      // Build base filters
      const filters: any = {};
      if (projectId) filters.projects = projectId;
      if (userId) filters.user = userId;
      if (dateFrom || dateTo) filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);

      const sort: any = {};
      sort[sortBy] = sortDir === 'asc' ? 1 : -1;

      // If promoteurId filter is present, do an in-memory filter after populating projects.
      if (promoteurId) {
        const all = await Comparison.find(filters)
          .populate({ path: 'projects', select: 'title priceFrom trustScore media.coverImage promoteur' })
          .populate('user', 'firstName lastName email')
          .sort(sort)
          .exec();

        console.debug('[ComparisonController.getAll] fetched', all.length, 'comparisons for promoteur filter; sample projects types:',
          all[0] ? (all[0].projects && all[0].projects.length > 0 ? typeof all[0].projects[0] : 'no-projects') : 'no-comparisons');

        const filtered = all.filter((c: any) => {
          return (c.projects || []).some((p: any) => p.promoteur && p.promoteur.toString() === promoteurId);
        });

        const total = filtered.length;
        const pages = Math.ceil(total / limitNum) || 1;
        const pageItems = filtered.slice(skip, skip + limitNum);

        return res.json({
          success: true,
          data: pageItems,
          pagination: { total, page: pageNum, pages, limit: limitNum },
        });
      }

      const comparisons = await Comparison.find(filters)
        .populate({ path: 'projects', select: 'title priceFrom trustScore media.coverImage' })
        .populate('user', 'firstName lastName email')
        .sort(sort)
        .limit(limitNum)
        .skip(skip)
        .exec();

      const total = await Comparison.countDocuments(filters);

      console.debug('[ComparisonController.getAll] returning', comparisons.length, 'comparisons (total:', total, ') — sample project[0]:',
        comparisons[0] && comparisons[0].projects && comparisons[0].projects[0] ? (comparisons[0].projects[0] as any).title || 'object-without-title' : 'no-project');

      res.json({
        success: true,
        data: comparisons,
        pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1, limit: limitNum },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
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
