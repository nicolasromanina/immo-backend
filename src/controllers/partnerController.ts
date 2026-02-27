import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { PartnerService } from '../services/PartnerService';

export class PartnerController {
  /**
   * Upload partner logo (admin)
   */
  static async uploadLogo(req: AuthRequest, res: Response) {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ message: 'Aucun fichier fourni' });
      }

      if (!String(file.mimetype || '').startsWith('image/')) {
        return res.status(400).json({ message: 'Le logo doit etre une image' });
      }

      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'partners',
      });

      const fs = require('fs').promises;
      try {
        await fs.unlink(file.path);
      } catch {
        // ignore cleanup errors
      }

      return res.json({ url: result.secure_url });
    } catch (error) {
      console.error('Error uploading partner logo:', error);
      return res.status(500).json({ message: 'Erreur upload logo' });
    }
  }

  /**
   * Get all partners (admin)
   */
  static async getPartnersAdmin(req: AuthRequest, res: Response) {
    try {
      const { type, status, country, city, page, limit } = req.query;

      const result = await PartnerService.getPartners({
        type: type as string,
        status: status as string,
        country: country as string,
        city: city as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json(result);
    } catch (error) {
      console.error('Error getting partners (admin):', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get all partners (public)
   */
  static async getPartners(req: AuthRequest, res: Response) {
    try {
      const { type, country, city, page, limit } = req.query;

      const result = await PartnerService.getPartners({
        type: type as string,
        status: 'active',
        country: country as string,
        city: city as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json(result);
    } catch (error) {
      console.error('Error getting partners:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get partner by ID
   */
  static async getPartner(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const partner = await PartnerService.getPartnerById(id);

      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }

      res.json({ partner });
    } catch (error) {
      console.error('Error getting partner:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get featured partners
   */
  static async getFeaturedPartners(req: AuthRequest, res: Response) {
    try {
      const { type } = req.query;

      const partners = await PartnerService.getFeaturedPartners(type as string);

      res.json({ partners });
    } catch (error) {
      console.error('Error getting featured partners:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Create partner (admin)
   */
  static async createPartner(req: AuthRequest, res: Response) {
    try {
      const partner = await PartnerService.createPartner(req.body);

      res.status(201).json({ partner });
    } catch (error) {
      console.error('Error creating partner:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update partner (admin)
   */
  static async updatePartner(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const partner = await PartnerService.updatePartner(id, req.body);

      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }

      res.json({ partner });
    } catch (error) {
      console.error('Error updating partner:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Verify partner (admin)
   */
  static async verifyPartner(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const partner = await PartnerService.verifyPartner(id, req.user!.id);

      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }

      res.json({ partner });
    } catch (error) {
      console.error('Error verifying partner:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Create service request
   */
  static async createServiceRequest(req: AuthRequest, res: Response) {
    try {
      const { projectId, type, description, preferredPartnerId } = req.body;

      const request = await PartnerService.createServiceRequest({
        clientId: req.user!.id,
        projectId,
        type,
        description,
        preferredPartnerId,
      });

      res.status(201).json({ request });
    } catch (error) {
      console.error('Error creating service request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get client's service requests
   */
  static async getMyServiceRequests(req: AuthRequest, res: Response) {
    try {
      const requests = await PartnerService.getClientRequests(req.user!.id);

      res.json({ requests });
    } catch (error) {
      console.error('Error getting service requests:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Assign request to partner (admin)
   */
  static async assignRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { partnerId } = req.body;

      const request = await PartnerService.assignRequest(id, partnerId);

      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }

      res.json({ request });
    } catch (error) {
      console.error('Error assigning request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Complete request
   */
  static async completeRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { partnerId } = req.body;

      const request = await PartnerService.completeRequest(id, partnerId);

      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }

      res.json({ request });
    } catch (error) {
      console.error('Error completing request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Rate service request
   */
  static async rateRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { rating, review } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }

      const request = await PartnerService.rateRequest(id, rating, review);

      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }

      res.json({ request });
    } catch (error) {
      console.error('Error rating request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
