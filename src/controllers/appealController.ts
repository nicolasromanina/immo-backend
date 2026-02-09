import { Request, Response } from 'express';
import { AppealProcessingService } from '../services/AppealProcessingService';

export class AppealController {
  /**
   * Create a new appeal
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const promoteurId = (req as any).user.promoteurProfile;

      if (!promoteurId) {
        return res.status(403).json({
          success: false,
          error: 'Only promoteurs can create appeals',
        });
      }

      const appeal = await AppealProcessingService.createAppeal({
        ...req.body,
        promoteurId: promoteurId.toString(),
      });

      res.status(201).json({
        success: true,
        data: appeal,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get appeal by ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const Appeal = require('../models/Appeal').default;
      
      const appeal = await Appeal.findById(id)
        .populate('promoteur', 'organizationName')
        .populate('project', 'title')
        .populate('assignedTo', 'firstName lastName email');

      if (!appeal) {
        return res.status(404).json({
          success: false,
          error: 'Appeal not found',
        });
      }

      res.json({
        success: true,
        data: appeal,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get all appeals (admin)
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { status, level, type } = req.query;
      const Appeal = require('../models/Appeal').default;

      const query: any = {};
      if (status) query.status = status;
      if (level) query.level = parseInt(level as string);
      if (type) query.type = type;

      const appeals = await Appeal.find(query)
        .populate('promoteur', 'organizationName')
        .populate('project', 'title')
        .populate('assignedTo', 'firstName lastName')
        .sort({ submittedAt: -1 });

      res.json({
        success: true,
        data: appeals,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get promoteur's appeals
   */
  static async getMyAppeals(req: Request, res: Response) {
    try {
      const promoteurId = (req as any).user.promoteurProfile;
      const Appeal = require('../models/Appeal').default;

      const appeals = await Appeal.find({ promoteur: promoteurId })
        .populate('project', 'title')
        .sort({ submittedAt: -1 });

      res.json({
        success: true,
        data: appeals,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Assign appeal (admin)
   */
  static async assign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reviewerId } = req.body;

      const appeal = await AppealProcessingService.assignAppeal(id, reviewerId);

      res.json({
        success: true,
        data: appeal,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Add review note (admin)
   */
  static async addNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { note, isInternal } = req.body;
      const userId = (req as any).user.id;

      const appeal = await AppealProcessingService.addReviewNote(id, userId, note, isInternal);

      res.json({
        success: true,
        data: appeal,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Escalate to N2 (admin)
   */
  static async escalate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { escalationReason } = req.body;
      const userId = (req as any).user.id;

      const appeal = await AppealProcessingService.escalateToN2(id, userId, escalationReason);

      res.json({
        success: true,
        data: appeal,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Resolve appeal (admin)
   */
  static async resolve(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { outcome, explanation, newAction } = req.body;
      const userId = (req as any).user.id;

      const appeal = await AppealProcessingService.resolveAppeal(id, userId, outcome, explanation, newAction);

      res.json({
        success: true,
        data: appeal,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get appeal statistics (admin)
   */
  static async getStats(req: Request, res: Response) {
    try {
      const { timeframe } = req.query;
      const stats = await AppealProcessingService.getAppealStats(timeframe as any || 'month');

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
