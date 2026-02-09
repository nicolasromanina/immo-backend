import { Request, Response } from 'express';
import Case from '../models/Case';
import { AuditLogService } from '../services/AuditLogService';
import { NotificationService } from '../services/NotificationService';

export class CaseController {
  /**
   * Create a new case
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const userRoles = (req as any).user.roles;

      const reporterType = userRoles.includes('promoteur') ? 'promoteur' :
                          userRoles.includes('admin') ? 'admin' : 'client';

      // Calculate SLA deadline based on priority
      const priorityHours: any = { low: 72, medium: 48, high: 24, urgent: 12 };
      const hours = priorityHours[req.body.priority || 'medium'];
      const slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);

      const caseData = new Case({
        ...req.body,
        reporter: userId,
        reporterType,
        slaDeadline,
        reportedAt: new Date(),
      });

      await caseData.save();

      // Notify admins
      await NotificationService.createAdminNotification({
        type: 'warning',
        title: 'Nouveau cas signalé',
        message: `${caseData.title} - ${caseData.category}`,
        priority: caseData.priority === 'urgent' ? 'urgent' : 'high',
        link: `/admin/cases/${caseData._id}`,
      });

      res.status(201).json({
        success: true,
        data: caseData,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get case by ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const caseData = await Case.findById(id)
        .populate('reporter', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .populate('project', 'title');

      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      res.json({
        success: true,
        data: caseData,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get all cases (admin)
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { status, priority, category, assignedTeam } = req.query;

      const query: any = {};
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (category) query.category = category;
      if (assignedTeam) query.assignedTeam = assignedTeam;

      const cases = await Case.find(query)
        .populate('reporter', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName')
        .sort({ priority: 1, reportedAt: -1 });

      res.json({
        success: true,
        data: cases,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get my cases
   */
  static async getMyCases(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const cases = await Case.find({ reporter: userId })
        .populate('project', 'title')
        .sort({ reportedAt: -1 });

      res.json({
        success: true,
        data: cases,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Assign case (admin)
   */
  static async assign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { assignedTo, assignedTeam } = req.body;

      const caseData = await Case.findById(id);
      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      caseData.assignedTo = assignedTo;
      caseData.assignedTeam = assignedTeam;
      caseData.status = 'en-cours';

      if (!caseData.firstResponseAt) {
        caseData.firstResponseAt = new Date();
      }

      await caseData.save();

      // Notify assigned person
      if (assignedTo) {
        await NotificationService.createNotification({
          user: assignedTo,
          type: 'info',
          title: 'Nouveau cas assigné',
          message: `${caseData.title} vous a été assigné`,
          priority: caseData.priority === 'urgent' ? 'urgent' : 'high',
          link: `/admin/cases/${id}`,
        });
      }

      res.json({
        success: true,
        data: caseData,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Add investigation note (admin)
   */
  static async addNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { note, isInternal, attachments } = req.body;
      const userId = (req as any).user.id;

      const caseData = await Case.findById(id);
      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      caseData.investigationNotes.push({
        note,
        addedBy: userId,
        addedAt: new Date(),
        isInternal: isInternal !== false,
        attachments: attachments || [],
      });

      await caseData.save();

      res.json({
        success: true,
        data: caseData,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Add communication
   */
  static async addCommunication(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { to, message, isInternal } = req.body;
      const userId = (req as any).user.id;

      const caseData = await Case.findById(id);
      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      caseData.communications.push({
        from: userId,
        to,
        message,
        sentAt: new Date(),
        isInternal: isInternal || false,
      });

      await caseData.save();

      // Send notification to recipient
      if (!isInternal) {
        await NotificationService.createNotification({
          user: to,
          type: 'info',
          title: 'Message concernant votre signalement',
          message: message.substring(0, 100),
          priority: 'medium',
          link: `/cases/${id}`,
        });
      }

      res.json({
        success: true,
        data: caseData,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Resolve case (admin)
   */
  static async resolve(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { outcome, explanation, actionTaken } = req.body;
      const userId = (req as any).user.id;

      const caseData = await Case.findById(id);
      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      caseData.resolution = {
        outcome,
        explanation,
        actionTaken,
        resolvedBy: userId,
        resolvedAt: new Date(),
      };

      caseData.status = 'resolu';
      caseData.resolvedAt = new Date();

      await caseData.save();

      // Notify reporter
      await NotificationService.createNotification({
        user: caseData.reporter,
        type: 'success',
        title: 'Votre signalement a été traité',
        message: explanation,
        priority: 'medium',
        link: `/cases/${id}`,
      });

      // Audit log
      await AuditLogService.log({
        actor: userId,
        actorRole: 'admin',
        action: 'case-resolved',
        category: 'moderation',
        targetType: 'Case',
        targetId: id,
        description: `Case resolved: ${outcome}`,
        metadata: { outcome, explanation },
      });

      res.json({
        success: true,
        data: caseData,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Close case
   */
  static async close(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const caseData = await Case.findById(id);
      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      caseData.status = 'ferme';
      caseData.closedAt = new Date();

      await caseData.save();

      res.json({
        success: true,
        data: caseData,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Submit feedback on case resolution
   */
  static async submitFeedback(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { satisfied, comment } = req.body;
      const userId = (req as any).user.id;

      const caseData = await Case.findById(id);
      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
        });
      }

      if (caseData.reporter.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only the reporter can submit feedback',
        });
      }

      caseData.reporterFeedback = {
        satisfied,
        comment,
        submittedAt: new Date(),
      };

      await caseData.save();

      res.json({
        success: true,
        data: caseData,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
