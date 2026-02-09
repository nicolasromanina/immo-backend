import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Update from '../models/Update';
import Project from '../models/Project';
import User from '../models/User';
import { AuditLogService } from '../services/AuditLogService';
import { UpdatePublishService } from '../services/UpdatePublishService';

export class UpdateController {
  /**
   * Create project update
   */
  static async createUpdate(req: AuthRequest, res: Response) {
    try {
      const {
        projectId,
        title,
        description,
        photos,
        whatsDone,
        nextStep,
        nextMilestoneDate,
        risksIdentified,
        milestone,
        scheduledFor,
      } = req.body;

      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(403).json({ message: 'Only promoteurs can create updates' });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check ownership
      if (project.promoteur.toString() !== user.promoteurProfile.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Validate photos (must be exactly 3)
      if (!photos || photos.length !== 3) {
        return res.status(400).json({ 
          message: 'Exactly 3 photos are required for each update' 
        });
      }

      if (!whatsDone || !nextStep || !risksIdentified || !nextMilestoneDate) {
        return res.status(400).json({ message: 'whatsDone, nextStep, risksIdentified and nextMilestoneDate are required' });
      }

      if (scheduledFor) {
        const scheduledDate = new Date(scheduledFor);
        if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
          return res.status(400).json({ message: 'scheduledFor must be a future date' });
        }
      }

      const update = new Update({
        project: projectId,
        promoteur: user.promoteurProfile,
        title,
        description,
        photos,
        whatsDone,
        nextStep,
        nextMilestoneDate: new Date(nextMilestoneDate),
        risksIdentified,
        milestone,
        status: scheduledFor ? 'scheduled' : 'draft',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        views: 0,
      });

      await update.save();

      await AuditLogService.logFromRequest(
        req,
        'create_update',
        'project',
        `Created update for project: ${project.title}`,
        'Update',
        update._id.toString()
      );

      res.status(201).json({ update });
    } catch (error) {
      console.error('Error creating update:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Publish update
   */
  static async publishUpdate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user!.id);

      const update = await Update.findById(id);
      if (!update) {
        return res.status(404).json({ message: 'Update not found' });
      }

      // Check ownership
      if (update.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      await UpdatePublishService.publishUpdate(update._id.toString());

      await AuditLogService.logFromRequest(
        req,
        'publish_update',
        'project',
        `Published update for project`,
        'Update',
        id
      );

      res.json({ update });
    } catch (error) {
      console.error('Error publishing update:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get updates for a project
   */
  static async getProjectUpdates(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const query: any = { project: projectId, status: 'published' };

      const skip = (Number(page) - 1) * Number(limit);

      const updates = await Update.find(query)
        .sort({ publishedAt: -1 })
        .limit(Number(limit))
        .skip(skip);

      const total = await Update.countDocuments(query);

      res.json({
        updates,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error getting updates:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get single update
   */
  static async getUpdate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const update = await Update.findById(id)
        .populate('project', 'title slug')
        .populate('promoteur', 'organizationName');

      if (!update) {
        return res.status(404).json({ message: 'Update not found' });
      }

      // Increment views
      update.views += 1;
      await update.save();

      res.json({ update });
    } catch (error) {
      console.error('Error getting update:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update an update (draft only)
   */
  static async updateUpdate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user!.id);

      const update = await Update.findById(id);
      if (!update) {
        return res.status(404).json({ message: 'Update not found' });
      }

      // Check ownership
      if (update.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Only drafts can be updated
      if (update.status !== 'draft' && update.status !== 'scheduled') {
        return res.status(400).json({ 
          message: 'Only draft or scheduled updates can be modified' 
        });
      }

      const allowedFields = [
        'title',
        'description',
        'photos',
        'whatsDone',
        'nextStep',
        'nextMilestoneDate',
        'risksIdentified',
        'milestone',
        'scheduledFor',
      ];

      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          (update as any)[key] = req.body[key];
        }
      });

      if (req.body.photos && req.body.photos.length !== 3) {
        return res.status(400).json({ message: 'Exactly 3 photos are required for each update' });
      }

      if (req.body.scheduledFor) {
        const scheduledDate = new Date(req.body.scheduledFor);
        if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
          return res.status(400).json({ message: 'scheduledFor must be a future date' });
        }
        update.status = 'scheduled';
        update.scheduledFor = scheduledDate;
      } else if (update.status === 'scheduled') {
        update.status = 'draft';
        update.scheduledFor = undefined;
      }

      await update.save();

      res.json({ update });
    } catch (error) {
      console.error('Error updating update:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Delete update (draft only)
   */
  static async deleteUpdate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user!.id);

      const update = await Update.findById(id);
      if (!update) {
        return res.status(404).json({ message: 'Update not found' });
      }

      // Check ownership
      if (update.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Only drafts can be deleted
      if (update.status !== 'draft') {
        return res.status(400).json({ 
          message: 'Only draft updates can be deleted' 
        });
      }

      await Update.findByIdAndDelete(id);

      res.json({ message: 'Update deleted successfully' });
    } catch (error) {
      console.error('Error deleting update:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get promoteur's updates
   */
  static async getMyUpdates(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(403).json({ message: 'Only promoteurs can access this' });
      }

      const { status, page = 1, limit = 20 } = req.query;

      const query: any = { promoteur: user.promoteurProfile };
      if (status) query.status = status;

      const skip = (Number(page) - 1) * Number(limit);

      const updates = await Update.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .populate('project', 'title slug');

      const total = await Update.countDocuments(query);

      res.json({
        updates,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error getting my updates:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get updates calendar grouped by scheduledFor date
   */
  static async getUpdatesCalendar(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(403).json({ message: 'Only promoteurs can access this' });
      }

      const { from, to } = req.query;
      const query: any = {
        promoteur: user.promoteurProfile,
        status: 'scheduled',
      };

      if (from || to) {
        query.scheduledFor = {};
        if (from) query.scheduledFor.$gte = new Date(from as string);
        if (to) query.scheduledFor.$lte = new Date(to as string);
      }

      const updates = await Update.find(query)
        .sort({ scheduledFor: 1 })
        .populate('project', 'title slug');

      const calendar: Record<string, any[]> = {};
      updates.forEach(update => {
        const dateKey = update.scheduledFor
          ? new Date(update.scheduledFor).toISOString().slice(0, 10)
          : 'unscheduled';
        if (!calendar[dateKey]) calendar[dateKey] = [];
        calendar[dateKey].push(update);
      });

      res.json({ calendar });
    } catch (error) {
      console.error('Error getting updates calendar:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
