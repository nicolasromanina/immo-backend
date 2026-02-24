"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppealController = void 0;
const AppealProcessingService_1 = require("../services/AppealProcessingService");
class AppealController {
    /**
     * Create a new appeal
     */
    static async create(req, res) {
        try {
            const userId = req.user.id;
            const promoteurId = req.user.promoteurProfile;
            if (!promoteurId) {
                return res.status(403).json({
                    success: false,
                    error: 'Only promoteurs can create appeals',
                });
            }
            const appeal = await AppealProcessingService_1.AppealProcessingService.createAppeal({
                ...req.body,
                promoteurId: promoteurId.toString(),
            });
            res.status(201).json({
                success: true,
                data: appeal,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get appeal by ID
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const Appeal = require('../models/Appeal').default;
            const appeal = await Appeal.findById(id)
                .populate('promoteur', 'organizationName')
                .populate('project', 'title')
                .populate('assignedTo', 'firstName lastName email');
            if (!appeal) {
                return res.status(404).json({
                    success: false,
                    error: 'Appeal not found',
                });
            }
            res.json({
                success: true,
                data: appeal,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get all appeals (admin)
     */
    static async getAll(req, res) {
        try {
            const { status, level, type } = req.query;
            const Appeal = require('../models/Appeal').default;
            const query = {};
            if (status)
                query.status = status;
            if (level)
                query.level = parseInt(level);
            if (type)
                query.type = type;
            const appeals = await Appeal.find(query)
                .populate('promoteur', 'organizationName')
                .populate('project', 'title')
                .populate('assignedTo', 'firstName lastName')
                .sort({ submittedAt: -1 });
            res.json({
                success: true,
                data: appeals,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get promoteur's appeals
     */
    static async getMyAppeals(req, res) {
        try {
            const promoteurId = req.user.promoteurProfile;
            const Appeal = require('../models/Appeal').default;
            const appeals = await Appeal.find({ promoteur: promoteurId })
                .populate('project', 'title')
                .sort({ submittedAt: -1 });
            res.json({
                success: true,
                data: appeals,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Assign appeal (admin)
     */
    static async assign(req, res) {
        try {
            const { id } = req.params;
            const { reviewerId } = req.body;
            const appeal = await AppealProcessingService_1.AppealProcessingService.assignAppeal(id, reviewerId);
            res.json({
                success: true,
                data: appeal,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Add review note (admin)
     */
    static async addNote(req, res) {
        try {
            const { id } = req.params;
            const { note, isInternal } = req.body;
            const userId = req.user.id;
            const appeal = await AppealProcessingService_1.AppealProcessingService.addReviewNote(id, userId, note, isInternal);
            res.json({
                success: true,
                data: appeal,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Escalate to N2 (admin)
     */
    static async escalate(req, res) {
        try {
            const { id } = req.params;
            const { escalationReason } = req.body;
            const userId = req.user.id;
            const appeal = await AppealProcessingService_1.AppealProcessingService.escalateToN2(id, userId, escalationReason);
            res.json({
                success: true,
                data: appeal,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Resolve appeal (admin)
     */
    static async resolve(req, res) {
        try {
            const { id } = req.params;
            const { outcome, explanation, newAction } = req.body;
            const userId = req.user.id;
            const appeal = await AppealProcessingService_1.AppealProcessingService.resolveAppeal(id, userId, outcome, explanation, newAction);
            res.json({
                success: true,
                data: appeal,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get appeal statistics (admin)
     */
    static async getStats(req, res) {
        try {
            const { timeframe } = req.query;
            const stats = await AppealProcessingService_1.AppealProcessingService.getAppealStats(timeframe || 'month');
            res.json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
}
exports.AppealController = AppealController;
