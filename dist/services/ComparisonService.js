"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComparisonService = void 0;
const Comparison_1 = __importDefault(require("../models/Comparison"));
const Project_1 = __importDefault(require("../models/Project"));
const Document_1 = __importDefault(require("../models/Document"));
const Update_1 = __importDefault(require("../models/Update"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Service for comparing projects
 */
class ComparisonService {
    /**
     * Create a new comparison
     */
    static async createComparison(params) {
        // Debug incoming params to help diagnose validation issues
        try {
            console.debug('[ComparisonService.createComparison] incoming projectIds:', params.projectIds);
            console.debug('[ComparisonService.createComparison] types:', params.projectIds.map((p) => typeof p));
            console.debug('[ComparisonService.createComparison] count:', params.projectIds.length);
        }
        catch (e) {
            console.debug('[ComparisonService.createComparison] failed to log params', e);
        }
        if (params.projectIds.length < 2 || params.projectIds.length > 3) {
            throw new Error('Must compare 2 or 3 projects');
        }
        // Fetch projects
        const projects = await Project_1.default.find({
            _id: { $in: params.projectIds },
            publicationStatus: 'published',
        });
        if (projects.length !== params.projectIds.length) {
            console.debug('[ComparisonService.createComparison] fetched projects count:', projects.length, 'expected:', params.projectIds.length);
            console.debug('[ComparisonService.createComparison] fetched project ids:', projects.map((p) => p._id?.toString()));
            throw new Error('Some projects not found or not published');
        }
        // Calculate metrics
        const metrics = await this.calculateMetrics(params.projectIds);
        const comparison = new Comparison_1.default({
            user: params.userId,
            projects: params.projectIds,
            metrics,
            notes: params.notes,
            isShared: false,
            viewCount: 1,
            lastViewedAt: new Date(),
        });
        await comparison.save();
        return comparison;
    }
    /**
     * Calculate comparison metrics for projects
     */
    static async calculateMetrics(projectIds) {
        const metrics = {
            trustScores: [],
            prices: [],
            deliveryDates: [],
            updateFrequencies: [],
            documentCounts: [],
            leadResponseTimes: [],
        };
        for (const projectId of projectIds) {
            const project = await Project_1.default.findById(projectId).populate('promoteur');
            if (!project)
                continue;
            metrics.trustScores.push(project.trustScore || 0);
            metrics.prices.push(project.priceFrom || 0);
            metrics.deliveryDates.push(project.timeline.deliveryDate || new Date());
            // Update frequency (days since last update)
            const lastUpdate = await Update_1.default.findOne({
                project: projectId,
                status: 'published',
            }).sort({ publishedAt: -1 });
            const updateFrequency = lastUpdate
                ? Math.floor((Date.now() - lastUpdate.publishedAt.getTime()) / (1000 * 60 * 60 * 24))
                : 999;
            metrics.updateFrequencies.push(updateFrequency);
            // Document count
            const docCount = await Document_1.default.countDocuments({
                project: projectId,
                status: 'fourni',
                visibility: 'public',
            });
            metrics.documentCounts.push(docCount);
            // Lead response time
            const promoteur = await Promoteur_1.default.findById(project.promoteur);
            metrics.leadResponseTimes.push(promoteur?.averageResponseTime || 999);
        }
        return metrics;
    }
    /**
     * Get comparison by ID
     */
    static async getComparison(comparisonId, userId) {
        const comparison = await Comparison_1.default.findById(comparisonId)
            .populate({
            path: 'projects',
            populate: {
                path: 'promoteur',
                select: 'organizationName trustScore badges',
            },
        });
        if (!comparison)
            throw new Error('Comparison not found');
        // Check access
        if (comparison.user.toString() !== userId &&
            !comparison.sharedWith.some(u => u.toString() === userId)) {
            throw new Error('Access denied');
        }
        // Increment view count
        comparison.viewCount += 1;
        comparison.lastViewedAt = new Date();
        await comparison.save();
        return comparison;
    }
    /**
     * Share comparison
     */
    static async shareComparison(comparisonId, userId, sharedWithUserIds) {
        const comparison = await Comparison_1.default.findById(comparisonId);
        if (!comparison)
            throw new Error('Comparison not found');
        if (comparison.user.toString() !== userId) {
            throw new Error('Only owner can share');
        }
        comparison.isShared = true;
        comparison.shareToken = crypto_1.default.randomBytes(16).toString('hex');
        if (sharedWithUserIds) {
            comparison.sharedWith = sharedWithUserIds;
        }
        await comparison.save();
        return {
            shareToken: comparison.shareToken,
            shareLink: `/comparisons/shared/${comparison.shareToken}`,
        };
    }
    /**
     * Get comparison by share token
     */
    static async getComparisonByToken(shareToken) {
        const comparison = await Comparison_1.default.findOne({ shareToken })
            .populate({
            path: 'projects',
            populate: {
                path: 'promoteur',
                select: 'organizationName trustScore badges',
            },
        });
        if (!comparison || !comparison.isShared) {
            throw new Error('Comparison not found or not shared');
        }
        comparison.viewCount += 1;
        comparison.lastViewedAt = new Date();
        await comparison.save();
        return comparison;
    }
    /**
     * Record decision
     */
    static async recordDecision(comparisonId, userId, selectedProjectId, reason) {
        const comparison = await Comparison_1.default.findById(comparisonId);
        if (!comparison)
            throw new Error('Comparison not found');
        if (comparison.user.toString() !== userId) {
            throw new Error('Only owner can record decision');
        }
        if (!comparison.projects.some(p => p.toString() === selectedProjectId)) {
            throw new Error('Selected project not in comparison');
        }
        comparison.decision = {
            selectedProject: selectedProjectId,
            reason,
            decidedAt: new Date(),
        };
        await comparison.save();
        return comparison;
    }
    /**
     * Get user's comparisons
     */
    static async getUserComparisons(userId, limit = 10) {
        return await Comparison_1.default.find({ user: userId })
            .populate('projects', 'title priceFrom trustScore media.coverImage')
            .sort({ createdAt: -1 })
            .limit(limit);
    }
    /**
     * Delete comparison
     */
    static async deleteComparison(comparisonId, userId) {
        const comparison = await Comparison_1.default.findById(comparisonId);
        if (!comparison)
            throw new Error('Comparison not found');
        if (comparison.user.toString() !== userId) {
            throw new Error('Only owner can delete');
        }
        await comparison.deleteOne();
        return { success: true };
    }
    /**
     * Get comparison insights (which project wins in each category)
     */
    static getComparisonInsights(comparison) {
        const insights = {
            bestTrustScore: { index: 0, value: 0 },
            lowestPrice: { index: 0, value: Infinity },
            earliestDelivery: { index: 0, value: new Date('2999-12-31') },
            mostFrequentUpdates: { index: 0, value: Infinity },
            mostDocuments: { index: 0, value: 0 },
            fastestResponse: { index: 0, value: Infinity },
        };
        const { metrics } = comparison;
        // Best trust score
        metrics.trustScores.forEach((score, index) => {
            if (score > insights.bestTrustScore.value) {
                insights.bestTrustScore = { index, value: score };
            }
        });
        // Lowest price
        metrics.prices.forEach((price, index) => {
            if (price < insights.lowestPrice.value) {
                insights.lowestPrice = { index, value: price };
            }
        });
        // Earliest delivery
        metrics.deliveryDates.forEach((date, index) => {
            if (date < insights.earliestDelivery.value) {
                insights.earliestDelivery = { index, value: date };
            }
        });
        // Most frequent updates (lower is better)
        metrics.updateFrequencies.forEach((freq, index) => {
            if (freq < insights.mostFrequentUpdates.value) {
                insights.mostFrequentUpdates = { index, value: freq };
            }
        });
        // Most documents
        metrics.documentCounts.forEach((count, index) => {
            if (count > insights.mostDocuments.value) {
                insights.mostDocuments = { index, value: count };
            }
        });
        // Fastest response
        metrics.leadResponseTimes.forEach((time, index) => {
            if (time < insights.fastestResponse.value) {
                insights.fastestResponse = { index, value: time };
            }
        });
        return insights;
    }
    /**
     * Get overall winner (most wins across categories)
     */
    static getOverallWinner(comparison) {
        const insights = this.getComparisonInsights(comparison);
        const scores = {};
        // Count wins for each project
        Object.values(insights).forEach((insight) => {
            scores[insight.index] = (scores[insight.index] || 0) + 1;
        });
        // Find winner
        let winnerIndex = 0;
        let maxScore = 0;
        Object.entries(scores).forEach(([index, score]) => {
            if (score > maxScore) {
                maxScore = score;
                winnerIndex = parseInt(index);
            }
        });
        return {
            winnerIndex,
            winsCount: maxScore,
            projectId: comparison.projects[winnerIndex],
        };
    }
}
exports.ComparisonService = ComparisonService;
