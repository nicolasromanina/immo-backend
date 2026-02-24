"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrochureController = void 0;
const BrochureService_1 = require("../services/BrochureService");
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
class BrochureController {
    /**
     * Request brochure for a project
     */
    static async requestBrochure(req, res) {
        try {
            const { projectId, firstName, lastName, email, phone, source } = req.body;
            if (!projectId || !firstName || !lastName || !email) {
                return res.status(400).json({
                    message: 'Project ID, first name, last name, and email are required'
                });
            }
            const request = await BrochureService_1.BrochureService.requestBrochure({
                projectId,
                firstName,
                lastName,
                email,
                phone,
                clientId: req.user?.id,
                source: source || 'website',
            });
            res.status(201).json({ request });
        }
        catch (error) {
            console.error('Error requesting brochure:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Track brochure download
     */
    static async trackDownload(req, res) {
        try {
            const { id } = req.params;
            const request = await BrochureService_1.BrochureService.trackDownload(id);
            if (!request) {
                return res.status(404).json({ message: 'Request not found' });
            }
            res.json({ success: true });
        }
        catch (error) {
            console.error('Error tracking download:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Track email open (tracking pixel)
     */
    static async trackEmailOpen(req, res) {
        try {
            const { id } = req.params;
            await BrochureService_1.BrochureService.trackEmailOpen(id);
            // Return 1x1 transparent pixel
            const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
            res.set('Content-Type', 'image/gif');
            res.send(pixel);
        }
        catch (error) {
            console.error('Error tracking email open:', error);
            // Still return pixel to not break email
            const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
            res.set('Content-Type', 'image/gif');
            res.send(pixel);
        }
    }
    /**
     * Send brochure via WhatsApp
     */
    static async sendViaWhatsApp(req, res) {
        try {
            const { id } = req.params;
            const request = await BrochureService_1.BrochureService.sendViaWhatsApp(id);
            res.json({ request });
        }
        catch (error) {
            console.error('Error sending via WhatsApp:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Get brochure requests for promoteur
     */
    static async getMyRequests(req, res) {
        try {
            const promoteur = await Promoteur_1.default.findOne({ user: req.user.id });
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const { status, startDate, endDate, page, limit } = req.query;
            const result = await BrochureService_1.BrochureService.getPromoteurRequests(promoteur._id.toString(), {
                status: status,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 20,
            });
            res.json(result);
        }
        catch (error) {
            console.error('Error getting brochure requests:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get brochure stats for promoteur
     */
    static async getStats(req, res) {
        try {
            const promoteur = await Promoteur_1.default.findOne({ user: req.user.id });
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const stats = await BrochureService_1.BrochureService.getStats(promoteur._id.toString());
            res.json({ stats });
        }
        catch (error) {
            console.error('Error getting brochure stats:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get project brochure requests
     */
    static async getProjectRequests(req, res) {
        try {
            const { projectId } = req.params;
            const requests = await BrochureService_1.BrochureService.getProjectRequests(projectId);
            res.json({ requests });
        }
        catch (error) {
            console.error('Error getting project requests:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.BrochureController = BrochureController;
