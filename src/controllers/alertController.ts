import { Request, Response } from 'express';
import Alert from '../models/Alert';
import { NotificationService } from '../services/NotificationService';

export class AlertController {
  /**
   * Create a new alert
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const alert = new Alert({
        ...req.body,
        user: userId,
      });

      await alert.save();

      res.status(201).json({
        success: true,
        data: alert,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get user's alerts
   */
  static async getMyAlerts(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { isRead } = req.query;

      const query: any = { user: userId };
      if (isRead !== undefined) {
        query.isRead = isRead === 'true';
      }

      const alerts = await Alert.find(query).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get active alert preferences
   */
  static async getActivePreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const alerts = await Alert.find({
        user: userId,
        isActive: true,
      }).select('-sentAt -readAt -isRead');

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update alert
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const alert = await Alert.findOne({ _id: id, user: userId });
      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found',
        });
      }

      Object.assign(alert, req.body);
      await alert.save();

      res.json({
        success: true,
        data: alert,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Mark alert as read
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const alert = await Alert.findOne({ _id: id, user: userId });
      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found',
        });
      }

      alert.isRead = true;
      alert.readAt = new Date();
      await alert.save();

      res.json({
        success: true,
        data: alert,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Mark all alerts as read
   */
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      await Alert.updateMany(
        { user: userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );

      res.json({
        success: true,
        message: 'All alerts marked as read',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete alert
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const alert = await Alert.findOne({ _id: id, user: userId });
      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found',
        });
      }

      await alert.deleteOne();

      res.json({
        success: true,
        message: 'Alert deleted',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Toggle alert on/off
   */
  static async toggle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const alert = await Alert.findOne({ _id: id, user: userId });
      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found',
        });
      }

      alert.isActive = !alert.isActive;
      await alert.save();

      res.json({
        success: true,
        data: alert,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
