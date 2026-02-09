import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import CRMWebhook from '../models/CRMWebhook';
import Promoteur from '../models/Promoteur';

export class CRMController {
  static async getConfig(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const promoteur = await Promoteur.findOne({ user: userId });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const config = await CRMWebhook.findOne({ promoteur: promoteur._id });
      res.json({ config });
    } catch (error) {
      console.error('Error getting CRM config:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async updateConfig(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { enabled, url, secret, events } = req.body;

      const promoteur = await Promoteur.findOne({ user: userId });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const config = await CRMWebhook.findOneAndUpdate(
        { promoteur: promoteur._id },
        { enabled, url, secret, events },
        { new: true, upsert: true }
      );

      res.json({ config });
    } catch (error) {
      console.error('Error updating CRM config:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
