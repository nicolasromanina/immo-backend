"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComparisonController = void 0;
const ComparisonService_1 = require("../services/ComparisonService");
const Comparison_1 = __importDefault(require("../models/Comparison"));
class ComparisonController {
    /**
     * Create a new comparison
     */
    static async create(req, res) {
        try {
            const userId = req.user.id;
            const { projectIds, notes } = req.body;
            // Debug incoming payload for diagnostics
            try {
                console.debug('[ComparisonController.create] user:', userId);
                console.debug('[ComparisonController.create] body.projectIds:', projectIds);
                if (Array.isArray(projectIds)) {
                    console.debug('[ComparisonController.create] projectIds types:', projectIds.map((p) => typeof p));
                    console.debug('[ComparisonController.create] projectIds length:', projectIds.length);
                }
            }
            catch (e) {
                console.debug('[ComparisonController.create] failed to log payload', e);
            }
            const comparison = await ComparisonService_1.ComparisonService.createComparison({
                userId,
                projectIds,
                notes,
            });
            res.status(201).json({
                success: true,
                data: comparison,
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
     * Get comparison by ID
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const comparison = await ComparisonService_1.ComparisonService.getComparison(id, userId);
            // Get insights
            const insights = ComparisonService_1.ComparisonService.getComparisonInsights(comparison);
            const winner = ComparisonService_1.ComparisonService.getOverallWinner(comparison);
            res.json({
                success: true,
                data: {
                    ...comparison.toObject(),
                    insights,
                    winner,
                },
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
     * Get comparison by share token
     */
    static async getByToken(req, res) {
        try {
            const { token } = req.params;
            const comparison = await ComparisonService_1.ComparisonService.getComparisonByToken(token);
            // Get insights
            const insights = ComparisonService_1.ComparisonService.getComparisonInsights(comparison);
            const winner = ComparisonService_1.ComparisonService.getOverallWinner(comparison);
            res.json({
                success: true,
                data: {
                    ...comparison.toObject(),
                    insights,
                    winner,
                },
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
     * Get user's comparisons
     */
    static async getMyComparisons(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 10;
            const comparisons = await ComparisonService_1.ComparisonService.getUserComparisons(userId, limit);
            res.json({
                success: true,
                data: comparisons,
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
     * Admin: get all comparisons (for moderation / admin dashboard)
     */
    static async getAll(req, res) {
        try {
            console.debug('[ComparisonController.getAll] query:', req.query);
            const { page = 1, limit = 20, projectId, userId, dateFrom, dateTo, promoteurId, sortBy = 'createdAt', sortDir = 'desc', } = req.query;
            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 20;
            const skip = (pageNum - 1) * limitNum;
            // Build base filters
            const filters = {};
            if (projectId)
                filters.projects = projectId;
            if (userId)
                filters.user = userId;
            if (dateFrom || dateTo)
                filters.createdAt = {};
            if (dateFrom)
                filters.createdAt.$gte = new Date(dateFrom);
            if (dateTo)
                filters.createdAt.$lte = new Date(dateTo);
            const sort = {};
            sort[sortBy] = sortDir === 'asc' ? 1 : -1;
            // If promoteurId filter is present, do an in-memory filter after populating projects.
            if (promoteurId) {
                const all = await Comparison_1.default.find(filters)
                    .populate({ path: 'projects', select: 'title priceFrom trustScore media.coverImage promoteur' })
                    .populate('user', 'firstName lastName email')
                    .sort(sort)
                    .exec();
                console.debug('[ComparisonController.getAll] fetched', all.length, 'comparisons for promoteur filter; sample projects types:', all[0] ? (all[0].projects && all[0].projects.length > 0 ? typeof all[0].projects[0] : 'no-projects') : 'no-comparisons');
                const filtered = all.filter((c) => {
                    return (c.projects || []).some((p) => p.promoteur && p.promoteur.toString() === promoteurId);
                });
                const total = filtered.length;
                const pages = Math.ceil(total / limitNum) || 1;
                const pageItems = filtered.slice(skip, skip + limitNum);
                return res.json({
                    success: true,
                    data: pageItems,
                    pagination: { total, page: pageNum, pages, limit: limitNum },
                });
            }
            const comparisons = await Comparison_1.default.find(filters)
                .populate({ path: 'projects', select: 'title priceFrom trustScore media.coverImage' })
                .populate('user', 'firstName lastName email')
                .sort(sort)
                .limit(limitNum)
                .skip(skip)
                .exec();
            const total = await Comparison_1.default.countDocuments(filters);
            console.debug('[ComparisonController.getAll] returning', comparisons.length, 'comparisons (total:', total, ') — sample project[0]:', comparisons[0] && comparisons[0].projects && comparisons[0].projects[0] ? comparisons[0].projects[0].title || 'object-without-title' : 'no-project');
            res.json({
                success: true,
                data: comparisons,
                pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1, limit: limitNum },
            });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
    /**
     * Share comparison
     */
    static async share(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { sharedWithUserIds } = req.body;
            const result = await ComparisonService_1.ComparisonService.shareComparison(id, userId, sharedWithUserIds);
            res.json({
                success: true,
                data: result,
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
     * Record decision
     */
    static async recordDecision(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { selectedProjectId, reason } = req.body;
            const comparison = await ComparisonService_1.ComparisonService.recordDecision(id, userId, selectedProjectId, reason);
            res.json({
                success: true,
                data: comparison,
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
     * Delete comparison
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            await ComparisonService_1.ComparisonService.deleteComparison(id, userId);
            res.json({
                success: true,
                message: 'Comparison deleted',
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
exports.ComparisonController = ComparisonController;
