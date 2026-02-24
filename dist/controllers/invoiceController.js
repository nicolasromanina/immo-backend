"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceController = void 0;
const InvoiceService_1 = require("../services/InvoiceService");
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const roles_1 = require("../config/roles");
class InvoiceController {
    /**
     * Get my invoices (promoteur)
     */
    static async getMyInvoices(req, res) {
        try {
            const promoteur = await Promoteur_1.default.findOne({ user: req.user.id });
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const { status } = req.query;
            const invoices = await InvoiceService_1.InvoiceService.getPromoterInvoices(promoteur._id.toString(), status);
            res.json({ invoices });
        }
        catch (error) {
            console.error('Error getting invoices:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get invoice by ID
     */
    static async getInvoice(req, res) {
        try {
            const { id } = req.params;
            const invoice = await require('../models/Invoice').default.findById(id)
                .populate('promoteur', 'organizationName');
            if (!invoice) {
                return res.status(404).json({ message: 'Invoice not found' });
            }
            // Verify ownership for non-admins
            if (!req.user.roles.includes(roles_1.Role.ADMIN)) {
                const promoteur = await Promoteur_1.default.findOne({ user: req.user.id });
                if (!promoteur || invoice.promoteur._id.toString() !== promoteur._id.toString()) {
                    return res.status(403).json({ message: 'Not authorized' });
                }
            }
            res.json({ invoice });
        }
        catch (error) {
            console.error('Error getting invoice:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    // Admin endpoints
    /**
     * Get all invoices (admin)
     */
    static async getAllInvoices(req, res) {
        try {
            const { status, type, startDate, endDate, page, limit } = req.query;
            const result = await InvoiceService_1.InvoiceService.getAllInvoices({
                status: status,
                type: type,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 20,
            });
            res.json(result);
        }
        catch (error) {
            console.error('Error getting invoices:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Create invoice (admin)
     */
    static async createInvoice(req, res) {
        try {
            const invoice = await InvoiceService_1.InvoiceService.createInvoice(req.body);
            res.status(201).json({ invoice });
        }
        catch (error) {
            console.error('Error creating invoice:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Create onboarding invoice (admin)
     */
    static async createOnboardingInvoice(req, res) {
        try {
            const { promoteurId, amount } = req.body;
            if (!promoteurId || !amount) {
                return res.status(400).json({ message: 'Promoteur ID and amount are required' });
            }
            const invoice = await InvoiceService_1.InvoiceService.createOnboardingInvoice(promoteurId, amount);
            res.status(201).json({ invoice });
        }
        catch (error) {
            console.error('Error creating onboarding invoice:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Mark invoice as paid (admin)
     */
    static async markAsPaid(req, res) {
        try {
            const { id } = req.params;
            const { paymentMethod, paymentIntentId, stripeInvoiceId } = req.body;
            const invoice = await InvoiceService_1.InvoiceService.markAsPaid(id, {
                paymentMethod,
                paymentIntentId,
                stripeInvoiceId,
            });
            if (!invoice) {
                return res.status(404).json({ message: 'Invoice not found' });
            }
            res.json({ invoice });
        }
        catch (error) {
            console.error('Error marking invoice as paid:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Mark invoice as failed (admin)
     */
    static async markAsFailed(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const invoice = await InvoiceService_1.InvoiceService.markAsFailed(id, reason);
            if (!invoice) {
                return res.status(404).json({ message: 'Invoice not found' });
            }
            res.json({ invoice });
        }
        catch (error) {
            console.error('Error marking invoice as failed:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Refund invoice (admin)
     */
    static async refundInvoice(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const invoice = await InvoiceService_1.InvoiceService.refundInvoice(id, reason);
            if (!invoice) {
                return res.status(404).json({ message: 'Invoice not found' });
            }
            res.json({ invoice });
        }
        catch (error) {
            console.error('Error refunding invoice:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get overdue invoices (admin)
     */
    static async getOverdueInvoices(req, res) {
        try {
            const invoices = await InvoiceService_1.InvoiceService.getOverdueInvoices();
            res.json({ invoices });
        }
        catch (error) {
            console.error('Error getting overdue invoices:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Send payment reminders (admin)
     */
    static async sendPaymentReminders(req, res) {
        try {
            const count = await InvoiceService_1.InvoiceService.sendPaymentReminders();
            res.json({ remindersSent: count });
        }
        catch (error) {
            console.error('Error sending reminders:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.InvoiceController = InvoiceController;
