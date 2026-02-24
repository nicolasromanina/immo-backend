"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDPRController = void 0;
const GDPRService_1 = require("../services/GDPRService");
class GDPRController {
    /**
     * Create GDPR request
     */
    static async createRequest(req, res) {
        try {
            const { type, description } = req.body;
            if (!['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'].includes(type)) {
                return res.status(400).json({ message: 'Invalid request type' });
            }
            const request = await GDPRService_1.GDPRService.createRequest(req.user.id, type, description);
            res.status(201).json({ request });
        }
        catch (error) {
            console.error('Error creating GDPR request:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get my data (data portability)
     */
    static async getMyData(req, res) {
        try {
            const data = await GDPRService_1.GDPRService.getUserData(req.user.id);
            res.json({ data });
        }
        catch (error) {
            console.error('Error getting user data:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Export my data as JSON
     */
    static async exportMyData(req, res) {
        try {
            const encoded = await GDPRService_1.GDPRService.exportToJSON(req.user.id);
            res.json({
                data: encoded,
                format: 'base64',
                filename: `my-data-${Date.now()}.json`,
            });
        }
        catch (error) {
            console.error('Error exporting user data:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get my consents
     */
    static async getMyConsents(req, res) {
        try {
            const consents = await GDPRService_1.GDPRService.getUserConsents(req.user.id);
            res.json({ consents });
        }
        catch (error) {
            console.error('Error getting consents:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update consent
     */
    static async updateConsent(req, res) {
        try {
            const { consentType, granted } = req.body;
            if (!consentType) {
                return res.status(400).json({ message: 'Consent type is required' });
            }
            const ipAddress = req.ip;
            const userAgent = req.get('User-Agent');
            const consent = await GDPRService_1.GDPRService.updateConsent(req.user.id, consentType, granted, ipAddress, userAgent);
            res.json({ consent });
        }
        catch (error) {
            console.error('Error updating consent:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update cookie preferences
     */
    static async updateCookiePreferences(req, res) {
        try {
            const { analytics, marketing, functional } = req.body;
            const consent = await GDPRService_1.GDPRService.updateCookiePreferences(req.user.id, { analytics, marketing, functional });
            res.json({ consent });
        }
        catch (error) {
            console.error('Error updating cookie preferences:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    // Admin endpoints
    /**
     * Get all GDPR requests (admin)
     */
    static async getRequests(req, res) {
        try {
            const { status, type, page, limit } = req.query;
            const result = await GDPRService_1.GDPRService.getRequests({
                status: status,
                type: type,
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 20,
            });
            res.json(result);
        }
        catch (error) {
            console.error('Error getting GDPR requests:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Process erasure request (admin)
     */
    static async processErasureRequest(req, res) {
        try {
            const { id } = req.params;
            const request = await GDPRService_1.GDPRService.processErasureRequest(id, req.user.id);
            res.json({ request });
        }
        catch (error) {
            console.error('Error processing erasure request:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Process access request (admin)
     */
    static async processAccessRequest(req, res) {
        try {
            const { id } = req.params;
            const request = await require('../models/GDPRRequest').default.findById(id);
            if (!request) {
                return res.status(404).json({ message: 'Request not found' });
            }
            const userData = await GDPRService_1.GDPRService.getUserData(request.user.toString());
            request.status = 'completed';
            request.processedBy = req.user.id;
            request.processedAt = new Date();
            request.responseData = userData;
            await request.save();
            res.json({ request, userData });
        }
        catch (error) {
            console.error('Error processing access request:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.GDPRController = GDPRController;
