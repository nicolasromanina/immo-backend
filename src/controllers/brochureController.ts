import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { BrochureService } from '../services/BrochureService';
import Promoteur from '../models/Promoteur';

export class BrochureController {
  /**
   * Request brochure for a project
   */
  static async requestBrochure(req: AuthRequest, res: Response) {
    try {
      const { projectId, firstName, lastName, email, phone, source } = req.body;

      if (!projectId || !firstName || !lastName || !email) {
        return res.status(400).json({ 
          message: 'Project ID, first name, last name, and email are required' 
        });
      }

      const request = await BrochureService.requestBrochure({
        projectId,
        firstName,
        lastName,
        email,
        phone,
        clientId: req.user?.id,
        source: source || 'website',
      });

      res.status(201).json({ request });
    } catch (error: any) {
      console.error('Error requesting brochure:', error);
      res.status(400).json({ message: error.message || 'Server error' });
    }
  }

  /**
   * Track brochure download
   */
  static async trackDownload(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const request = await BrochureService.trackDownload(id);

      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking download:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Track email open (tracking pixel)
   */
  static async trackEmailOpen(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await BrochureService.trackEmailOpen(id);

      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      
      res.set('Content-Type', 'image/gif');
      res.send(pixel);
    } catch (error) {
      console.error('Error tracking email open:', error);
      // Still return pixel to not break email
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.set('Content-Type', 'image/gif');
      res.send(pixel);
    }
  }

  /**
   * Send brochure via WhatsApp
   */
  static async sendViaWhatsApp(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const request = await BrochureService.sendViaWhatsApp(id);

      res.json({ request });
    } catch (error: any) {
      console.error('Error sending via WhatsApp:', error);
      res.status(400).json({ message: error.message || 'Server error' });
    }
  }

  /**
   * Get brochure requests for promoteur
   */
  static async getMyRequests(req: AuthRequest, res: Response) {
    try {
      const promoteur = await Promoteur.findOne({ user: req.user!.id });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const { status, startDate, endDate, page, limit } = req.query;

      const result = await BrochureService.getPromoteurRequests(
        promoteur._id.toString(),
        {
          status: status as string,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 20,
        }
      );

      res.json(result);
    } catch (error) {
      console.error('Error getting brochure requests:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get brochure stats for promoteur
   */
  static async getStats(req: AuthRequest, res: Response) {
    try {
      const promoteur = await Promoteur.findOne({ user: req.user!.id });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const stats = await BrochureService.getStats(promoteur._id.toString());

      res.json({ stats });
    } catch (error) {
      console.error('Error getting brochure stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get project brochure requests
   */
  static async getProjectRequests(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;

      const requests = await BrochureService.getProjectRequests(projectId);

      res.json({ requests });
    } catch (error) {
      console.error('Error getting project requests:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
