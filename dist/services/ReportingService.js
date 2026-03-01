"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingService = void 0;
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const Project_1 = __importDefault(require("../models/Project"));
const Lead_1 = __importDefault(require("../models/Lead"));
const Update_1 = __importDefault(require("../models/Update"));
const User_1 = __importDefault(require("../models/User"));
const Case_1 = __importDefault(require("../models/Case"));
const Appeal_1 = __importDefault(require("../models/Appeal"));
/**
 * Service for generating reports and analytics
 */
class ReportingService {
    /**
     * Generate monthly platform report
     */
    static async generateMonthlyReport(year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const report = {
            period: { year, month, startDate, endDate },
            users: await this.getUserStats(startDate, endDate),
            promoteurs: await this.getPromoteurStats(startDate, endDate),
            projects: await this.getProjectStats(startDate, endDate),
            leads: await this.getLeadStats(startDate, endDate),
            trustSafety: await this.getTrustSafetyStats(startDate, endDate),
            engagement: await this.getEngagementStats(startDate, endDate),
        };
        return report;
    }
    /**
     * User statistics
     */
    static async getUserStats(startDate, endDate) {
        const newUsers = await User_1.default.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
        });
        const totalUsers = await User_1.default.countDocuments();
        const activeUsers = await User_1.default.countDocuments({
            lastLogin: { $gte: startDate, $lte: endDate },
        });
        const byRole = await User_1.default.aggregate([
            { $unwind: '$roles' },
            { $group: { _id: '$roles', count: { $sum: 1 } } },
        ]);
        return {
            total: totalUsers,
            new: newUsers,
            active: activeUsers,
            byRole,
        };
    }
    /**
     * Promoteur statistics
     */
    static async getPromoteurStats(startDate, endDate) {
        const newPromoteurs = await Promoteur_1.default.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
        });
        const totalPromoteurs = await Promoteur_1.default.countDocuments();
        const byPlan = await Promoteur_1.default.aggregate([
            { $group: { _id: '$plan', count: { $sum: 1 } } },
        ]);
        const byKYCStatus = await Promoteur_1.default.aggregate([
            { $group: { _id: '$kycStatus', count: { $sum: 1 } } },
        ]);
        const avgTrustScore = await Promoteur_1.default.aggregate([
            { $group: { _id: null, avg: { $avg: '$trustScore' } } },
        ]);
        const onboardingCompletion = await Promoteur_1.default.countDocuments({
            onboardingCompleted: true,
        });
        return {
            total: totalPromoteurs,
            new: newPromoteurs,
            byPlan,
            byKYCStatus,
            avgTrustScore: avgTrustScore[0]?.avg || 0,
            onboardingCompletionRate: totalPromoteurs > 0
                ? ((onboardingCompletion / totalPromoteurs) * 100).toFixed(1)
                : '0',
        };
    }
    /**
     * Project statistics
     */
    static async getProjectStats(startDate, endDate) {
        const newProjects = await Project_1.default.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
        });
        const totalProjects = await Project_1.default.countDocuments();
        const byStatus = await Project_1.default.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const byPublicationStatus = await Project_1.default.aggregate([
            { $group: { _id: '$publicationStatus', count: { $sum: 1 } } },
        ]);
        const avgTrustScore = await Project_1.default.aggregate([
            { $match: { publicationStatus: 'published' } },
            { $group: { _id: null, avg: { $avg: '$trustScore' } } },
        ]);
        const updateStats = await Update_1.default.aggregate([
            {
                $match: {
                    publishedAt: { $gte: startDate, $lte: endDate },
                    status: 'published'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 }
                }
            },
        ]);
        return {
            total: totalProjects,
            new: newProjects,
            byStatus,
            byPublicationStatus,
            avgTrustScore: avgTrustScore[0]?.avg || 0,
            updatesPublished: updateStats[0]?.total || 0,
        };
    }
    /**
     * Lead statistics
     */
    static async getLeadStats(startDate, endDate) {
        const newLeads = await Lead_1.default.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
        });
        const byScore = await Lead_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$score', count: { $sum: 1 } } },
        ]);
        const byStatus = await Lead_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const converted = await Lead_1.default.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
            converted: true,
        });
        const conversionRate = newLeads > 0
            ? ((converted / newLeads) * 100).toFixed(1)
            : '0';
        const avgResponseTime = await Lead_1.default.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    responseTime: { $exists: true }
                }
            },
            { $group: { _id: null, avg: { $avg: '$responseTime' } } },
        ]);
        return {
            total: newLeads,
            byScore,
            byStatus,
            converted,
            conversionRate,
            avgResponseTime: avgResponseTime[0]?.avg || 0,
        };
    }
    /**
     * Trust & Safety statistics
     */
    static async getTrustSafetyStats(startDate, endDate) {
        const newCases = await Case_1.default.countDocuments({
            reportedAt: { $gte: startDate, $lte: endDate },
        });
        const casesByStatus = await Case_1.default.aggregate([
            { $match: { reportedAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const casesByCategory = await Case_1.default.aggregate([
            { $match: { reportedAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]);
        const appeals = await Appeal_1.default.countDocuments({
            submittedAt: { $gte: startDate, $lte: endDate },
        });
        const appealsApproved = await Appeal_1.default.countDocuments({
            submittedAt: { $gte: startDate, $lte: endDate },
            status: 'approved',
        });
        const sanctionedPromoteurs = await Promoteur_1.default.countDocuments({
            'restrictions.appliedAt': { $gte: startDate, $lte: endDate },
        });
        return {
            newCases,
            casesByStatus,
            casesByCategory,
            appeals,
            appealsApproved,
            appealApprovalRate: appeals > 0
                ? ((appealsApproved / appeals) * 100).toFixed(1)
                : '0',
            sanctionedPromoteurs,
        };
    }
    /**
     * Engagement statistics
     */
    static async getEngagementStats(startDate, endDate) {
        // Projects with high engagement
        const highEngagementProjects = await Project_1.default.countDocuments({
            views: { $gte: 100 },
            favorites: { $gte: 10 },
        });
        // Average views per project
        const avgViews = await Project_1.default.aggregate([
            { $match: { publicationStatus: 'published' } },
            { $group: { _id: null, avg: { $avg: '$views' } } },
        ]);
        // Total favorites
        const totalFavorites = await Project_1.default.aggregate([
            { $group: { _id: null, total: { $sum: '$favorites' } } },
        ]);
        return {
            highEngagementProjects,
            avgViewsPerProject: avgViews[0]?.avg || 0,
            totalFavorites: totalFavorites[0]?.total || 0,
        };
    }
    /**
     * Generate promoteur performance report
     */
    static async generatePromoteurReport(promoteurId, startDate, endDate) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            throw new Error('Promoteur not found');
        const projects = await Project_1.default.find({
            promoteur: promoteurId,
            createdAt: { $gte: startDate, $lte: endDate },
        });
        const leads = await Lead_1.default.find({
            promoteur: promoteurId,
            createdAt: { $gte: startDate, $lte: endDate },
        });
        const updates = await Update_1.default.find({
            promoteur: promoteurId,
            publishedAt: { $gte: startDate, $lte: endDate },
            status: 'published',
        });
        const convertedLeads = leads.filter(l => l.converted).length;
        const conversionRate = leads.length > 0
            ? ((convertedLeads / leads.length) * 100).toFixed(1)
            : '0';
        return {
            promoteur: {
                name: promoteur.organizationName,
                plan: promoteur.plan,
                trustScore: promoteur.trustScore,
                badges: promoteur.badges,
            },
            period: { startDate, endDate },
            projects: {
                total: projects.length,
                byStatus: this.groupBy(projects, 'status'),
            },
            leads: {
                total: leads.length,
                converted: convertedLeads,
                conversionRate,
                byScore: this.groupBy(leads, 'score'),
                avgResponseTime: promoteur.averageResponseTime,
            },
            updates: {
                total: updates.length,
                frequency: projects.length > 0
                    ? (updates.length / projects.length).toFixed(1)
                    : '0',
            },
            engagement: {
                totalViews: projects.reduce((sum, p) => sum + p.views, 0),
                totalFavorites: projects.reduce((sum, p) => sum + p.favorites, 0),
            },
        };
    }
    /**
     * Helper: Group array by field
     */
    static groupBy(array, field) {
        return array.reduce((acc, item) => {
            const key = item[field] || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }
    /**
     * Generate discipline dashboard (update cadence)
     */
    static async generateDisciplineDashboard() {
        const projects = await Project_1.default.find({
            publicationStatus: 'published',
            status: { $in: ['demarrage-chantier', 'fondations', 'gros-oeuvres', 'second-oeuvres'] },
        }).populate('promoteur');
        const dashboard = [];
        for (const project of projects) {
            const lastUpdate = await Update_1.default.findOne({
                project: project._id,
                status: 'published',
            }).sort({ publishedAt: -1 });
            let daysSinceUpdate = 999;
            let status = 'critical';
            if (lastUpdate) {
                daysSinceUpdate = Math.floor((Date.now() - lastUpdate.publishedAt.getTime()) / (1000 * 60 * 60 * 24));
                if (daysSinceUpdate <= 30)
                    status = 'good';
                else if (daysSinceUpdate <= 45)
                    status = 'warning';
                else if (daysSinceUpdate <= 60)
                    status = 'alert';
                else
                    status = 'critical';
            }
            dashboard.push({
                projectId: project._id,
                projectName: project.title,
                promoteur: project.promoteur.organizationName,
                daysSinceUpdate,
                status,
                lastUpdateDate: lastUpdate?.publishedAt,
                totalUpdates: project.totalUpdates,
            });
        }
        // Sort by most critical first
        dashboard.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
        return {
            projects: dashboard,
            summary: {
                good: dashboard.filter(p => p.status === 'good').length,
                warning: dashboard.filter(p => p.status === 'warning').length,
                alert: dashboard.filter(p => p.status === 'alert').length,
                critical: dashboard.filter(p => p.status === 'critical').length,
            },
        };
    }
}
exports.ReportingService = ReportingService;
