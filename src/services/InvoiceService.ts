import Invoice from '../models/Invoice';
import Subscription from '../models/Subscription';
import Promoteur from '../models/Promoteur';
import { NotificationService } from './NotificationService';
import mongoose from 'mongoose';

export class InvoiceService {
  /**
   * Generate invoice number
   */
  private static generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${year}${month}-${random}`;
  }

  /**
   * Create invoice
   */
  static async createInvoice(data: {
    promoteurId: string;
    subscriptionId?: string;
    type: 'subscription' | 'onboarding' | 'addon' | 'custom';
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
    taxRate?: number;
    dueDate: Date;
    billingInfo: {
      name: string;
      email: string;
      address?: string;
      city?: string;
      country?: string;
      taxId?: string;
    };
    notes?: string;
  }) {
    const subtotal = data.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxRate = data.taxRate || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const invoice = new Invoice({
      promoteur: data.promoteurId,
      subscription: data.subscriptionId,
      invoiceNumber: this.generateInvoiceNumber(),
      type: data.type,
      subtotal,
      tax,
      taxRate,
      total,
      currency: 'XOF',
      lineItems: data.lineItems.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice,
      })),
      status: 'pending',
      issuedAt: new Date(),
      dueDate: data.dueDate,
      billingInfo: data.billingInfo,
      notes: data.notes,
    });

    await invoice.save();

    // Send invoice notification
    await NotificationService.create({
      recipient: data.billingInfo.email,
      type: 'system',
      title: 'Nouvelle facture',
      message: `Facture ${invoice.invoiceNumber} de ${total.toLocaleString()} XOF`,
      priority: 'high',
      channels: { inApp: true, email: true },
      data: { invoiceId: invoice._id },
    });

    return invoice;
  }

  /**
   * Create subscription invoice
   */
  static async createSubscriptionInvoice(subscriptionId: string) {
    const subscription = await Subscription.findById(subscriptionId).populate('promoteur');
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const promoteur = await Promoteur.findById(subscription.promoteur).populate('user');
    if (!promoteur) {
      throw new Error('Promoteur not found');
    }

    const user = promoteur.user as any;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Get pricing based on plan
    const planPricing: Record<string, number> = {
      basique: 2000,
      standard: 10000,
      premium: 25000,
    };
    const subscriptionAmount = planPricing[subscription.plan] || 2000;

    return this.createInvoice({
      promoteurId: promoteur._id.toString(),
      subscriptionId,
      type: 'subscription',
      lineItems: [
        {
          description: `Abonnement ${subscription.plan} - mensuel`,
          quantity: 1,
          unitPrice: subscriptionAmount,
        },
      ],
      dueDate,
      billingInfo: {
        name: promoteur.organizationName,
        email: user.email,
        address: promoteur.companyAddress,
        country: 'SN', // Default
      },
    });
  }

  /**
   * Create onboarding fee invoice
   */
  static async createOnboardingInvoice(promoteurId: string, amount: number) {
    const promoteur = await Promoteur.findById(promoteurId).populate('user');
    if (!promoteur) {
      throw new Error('Promoteur not found');
    }

    const user = promoteur.user as any;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    return this.createInvoice({
      promoteurId,
      type: 'onboarding',
      lineItems: [
        {
          description: 'Frais d\'onboarding - Inscription plateforme',
          quantity: 1,
          unitPrice: amount,
        },
      ],
      dueDate,
      billingInfo: {
        name: promoteur.organizationName,
        email: user.email,
        address: promoteur.companyAddress,
        country: 'SN',
      },
    });
  }

  /**
   * Mark invoice as paid
   */
  static async markAsPaid(invoiceId: string, paymentDetails: {
    paymentMethod?: string;
    paymentIntentId?: string;
    stripeInvoiceId?: string;
  }) {
    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        status: 'paid',
        paidAt: new Date(),
        ...paymentDetails,
      },
      { new: true }
    );

    if (invoice) {
      // Update promoteur payment history
      await Promoteur.findByIdAndUpdate(invoice.promoteur, {
        $push: {
          paymentHistory: {
            amount: invoice.total,
            type: invoice.type,
            status: 'paid',
            date: new Date(),
          },
        },
      });

      // Send confirmation
      await NotificationService.create({
        recipient: invoice.billingInfo.email,
        type: 'system',
        title: 'Paiement reçu',
        message: `Votre paiement pour la facture ${invoice.invoiceNumber} a été reçu`,
        priority: 'medium',
        channels: { inApp: true, email: true },
      });
    }

    return invoice;
  }

  /**
   * Mark invoice as failed
   */
  static async markAsFailed(invoiceId: string, reason?: string) {
    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        status: 'failed',
        notes: reason,
      },
      { new: true }
    );

    if (invoice) {
      await NotificationService.create({
        recipient: invoice.billingInfo.email,
        type: 'warning',
        title: 'Échec de paiement',
        message: `Le paiement pour la facture ${invoice.invoiceNumber} a échoué`,
        priority: 'urgent',
        channels: { inApp: true, email: true },
      });
    }

    return invoice;
  }

  /**
   * Send payment reminders
   */
  static async sendPaymentReminders() {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let remindersSent = 0;

    // First reminder: due tomorrow
    const dueTomorrow = await Invoice.find({
      status: 'pending',
      dueDate: { $lte: oneDayFromNow, $gte: now },
      'remindersSent.type': { $ne: 'first' },
    });

    for (const invoice of dueTomorrow) {
      await this.sendReminder(invoice, 'first');
      remindersSent++;
    }

    // Second reminder: 3 days overdue
    const overdue3Days = await Invoice.find({
      status: 'pending',
      dueDate: { $lte: threeDaysAgo },
      'remindersSent.type': { $ne: 'second' },
    });

    for (const invoice of overdue3Days) {
      await this.sendReminder(invoice, 'second');
      remindersSent++;
    }

    // Final reminder: 7 days overdue
    const overdue7Days = await Invoice.find({
      status: 'pending',
      dueDate: { $lte: sevenDaysAgo },
      'remindersSent.type': { $ne: 'final' },
    });

    for (const invoice of overdue7Days) {
      await this.sendReminder(invoice, 'final');
      remindersSent++;
    }

    return remindersSent;
  }

  /**
   * Send a reminder for an invoice
   */
  private static async sendReminder(invoice: any, type: 'first' | 'second' | 'final') {
    const messages = {
      first: `Rappel: Votre facture ${invoice.invoiceNumber} est due demain`,
      second: `Rappel urgent: Votre facture ${invoice.invoiceNumber} est en retard de 3 jours`,
      final: `Dernier rappel: Votre facture ${invoice.invoiceNumber} est impayée. Action immédiate requise.`,
    };

    await NotificationService.create({
      recipient: invoice.billingInfo.email,
      type: type === 'final' ? 'warning' : 'system',
      title: type === 'final' ? 'Dernier rappel de paiement' : 'Rappel de paiement',
      message: messages[type],
      priority: type === 'final' ? 'urgent' : 'high',
      channels: { inApp: true, email: true },
    });

    await Invoice.findByIdAndUpdate(invoice._id, {
      $push: { remindersSent: { type, sentAt: new Date() } },
    });
  }

  /**
   * Get invoices for a promoteur
   */
  static async getPromoterInvoices(promoteurId: string, status?: string) {
    const query: any = { promoteur: promoteurId };
    if (status) query.status = status;

    return Invoice.find(query).sort({ issuedAt: -1 });
  }

  /**
   * Get all invoices (admin)
   */
  static async getAllInvoices(filters: {
    status?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.startDate || filters.endDate) {
      query.issuedAt = {};
      if (filters.startDate) query.issuedAt.$gte = filters.startDate;
      if (filters.endDate) query.issuedAt.$lte = filters.endDate;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const invoices = await Invoice.find(query)
      .populate('promoteur', 'organizationName')
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Invoice.countDocuments(query);

    // Calculate totals
    const totals = await Invoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      invoices,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      totals: totals.reduce((acc, t) => {
        acc[t._id] = { amount: t.total, count: t.count };
        return acc;
      }, {} as Record<string, { amount: number; count: number }>),
    };
  }

  /**
   * Refund invoice
   */
  static async refundInvoice(invoiceId: string, reason?: string) {
    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        status: 'refunded',
        notes: reason ? `Remboursé: ${reason}` : 'Remboursé',
      },
      { new: true }
    );

    if (invoice) {
      await NotificationService.create({
        recipient: invoice.billingInfo.email,
        type: 'system',
        title: 'Remboursement effectué',
        message: `La facture ${invoice.invoiceNumber} a été remboursée`,
        priority: 'medium',
        channels: { inApp: true, email: true },
      });
    }

    return invoice;
  }

  /**
   * Get overdue invoices
   */
  static async getOverdueInvoices() {
    return Invoice.find({
      status: 'pending',
      dueDate: { $lt: new Date() },
    })
      .populate('promoteur', 'organizationName user')
      .sort({ dueDate: 1 });
  }
}
