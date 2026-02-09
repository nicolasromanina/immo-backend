import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { InvoiceService } from '../services/InvoiceService';
import Promoteur from '../models/Promoteur';
import { Role } from '../config/roles';

export class InvoiceController {
  /**
   * Get my invoices (promoteur)
   */
  static async getMyInvoices(req: AuthRequest, res: Response) {
    try {
      const promoteur = await Promoteur.findOne({ user: req.user!.id });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const { status } = req.query;

      const invoices = await InvoiceService.getPromoterInvoices(
        promoteur._id.toString(),
        status as string
      );

      res.json({ invoices });
    } catch (error) {
      console.error('Error getting invoices:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoice(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const invoice = await require('../models/Invoice').default.findById(id)
        .populate('promoteur', 'organizationName');

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      // Verify ownership for non-admins
      if (!req.user!.roles.includes(Role.ADMIN)) {
        const promoteur = await Promoteur.findOne({ user: req.user!.id });
        if (!promoteur || invoice.promoteur._id.toString() !== promoteur._id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }

      res.json({ invoice });
    } catch (error) {
      console.error('Error getting invoice:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Admin endpoints

  /**
   * Get all invoices (admin)
   */
  static async getAllInvoices(req: AuthRequest, res: Response) {
    try {
      const { status, type, startDate, endDate, page, limit } = req.query;

      const result = await InvoiceService.getAllInvoices({
        status: status as string,
        type: type as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json(result);
    } catch (error) {
      console.error('Error getting invoices:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Create invoice (admin)
   */
  static async createInvoice(req: AuthRequest, res: Response) {
    try {
      const invoice = await InvoiceService.createInvoice(req.body);

      res.status(201).json({ invoice });
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Create onboarding invoice (admin)
   */
  static async createOnboardingInvoice(req: AuthRequest, res: Response) {
    try {
      const { promoteurId, amount } = req.body;

      if (!promoteurId || !amount) {
        return res.status(400).json({ message: 'Promoteur ID and amount are required' });
      }

      const invoice = await InvoiceService.createOnboardingInvoice(promoteurId, amount);

      res.status(201).json({ invoice });
    } catch (error: any) {
      console.error('Error creating onboarding invoice:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }

  /**
   * Mark invoice as paid (admin)
   */
  static async markAsPaid(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { paymentMethod, paymentIntentId, stripeInvoiceId } = req.body;

      const invoice = await InvoiceService.markAsPaid(id, {
        paymentMethod,
        paymentIntentId,
        stripeInvoiceId,
      });

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      res.json({ invoice });
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Mark invoice as failed (admin)
   */
  static async markAsFailed(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const invoice = await InvoiceService.markAsFailed(id, reason);

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      res.json({ invoice });
    } catch (error) {
      console.error('Error marking invoice as failed:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Refund invoice (admin)
   */
  static async refundInvoice(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const invoice = await InvoiceService.refundInvoice(id, reason);

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      res.json({ invoice });
    } catch (error) {
      console.error('Error refunding invoice:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get overdue invoices (admin)
   */
  static async getOverdueInvoices(req: AuthRequest, res: Response) {
    try {
      const invoices = await InvoiceService.getOverdueInvoices();

      res.json({ invoices });
    } catch (error) {
      console.error('Error getting overdue invoices:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Send payment reminders (admin)
   */
  static async sendPaymentReminders(req: AuthRequest, res: Response) {
    try {
      const count = await InvoiceService.sendPaymentReminders();

      res.json({ remindersSent: count });
    } catch (error) {
      console.error('Error sending reminders:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
