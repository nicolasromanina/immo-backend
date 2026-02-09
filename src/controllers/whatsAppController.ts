import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Lead from '../models/Lead';
import Promoteur from '../models/Promoteur';
import WhatsAppMessage from '../models/WhatsAppMessage';
import { WhatsAppService } from '../services/WhatsAppService';

export class WhatsAppController {
  /**
   * Send WhatsApp message to a lead using a template
   */
  static async sendToLead(req: AuthRequest, res: Response) {
    try {
      const { leadId, templateSlug, data } = req.body;
      const userId = req.user!.id;

      const lead = await Lead.findById(leadId);
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      const promoteur = await Promoteur.findById(lead.promoteur);
      if (!promoteur || promoteur.user.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (!lead.whatsapp && !lead.phone) {
        return res.status(400).json({ message: 'Lead has no WhatsApp number' });
      }

      const to = lead.whatsapp || lead.phone;

      const message = await WhatsAppService.sendTemplateMessage({
        to,
        templateSlug,
        data: data || {},
      });

      const log = await WhatsAppMessage.create({
        promoteur: lead.promoteur,
        lead: lead._id,
        to,
        templateSlug,
        content: JSON.stringify(message),
        status: 'sent',
        sentAt: new Date(),
      });

      res.json({ message, log });
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Get WhatsApp messages for a lead
   */
  static async getLeadMessages(req: AuthRequest, res: Response) {
    try {
      const { leadId } = req.params;
      const userId = req.user!.id;

      const lead = await Lead.findById(leadId);
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      const promoteur = await Promoteur.findById(lead.promoteur);
      if (!promoteur || promoteur.user.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const messages = await WhatsAppMessage.find({ lead: lead._id })
        .sort({ createdAt: -1 });

      res.json({ messages });
    } catch (error) {
      console.error('Error getting WhatsApp messages:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
