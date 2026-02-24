"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedTrustScoreService = void 0;
const TrustScoreConfig_1 = __importDefault(require("../models/TrustScoreConfig"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const Project_1 = __importDefault(require("../models/Project"));
const Update_1 = __importDefault(require("../models/Update"));
const Document_1 = __importDefault(require("../models/Document"));
const Lead_1 = __importDefault(require("../models/Lead"));
const AuditLogService_1 = require("./AuditLogService");
const TrustScoreSnapshot_1 = __importDefault(require("../models/TrustScoreSnapshot"));
class AdvancedTrustScoreService {
    /**
     * Get active config or default
     */
    static async getActiveConfig() {
        const config = await TrustScoreConfig_1.default.findOne({ isActive: true });
        return config || this.defaultConfig;
    }
    /**
     * Calculate trust score for a promoteur
     */
    static async calculateScore(promoteurId) {
        const config = await this.getActiveConfig();
        const weights = config.weights;
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            throw new Error('Promoteur not found');
        let totalScore = 0;
        // 1. KYC Score
        const kycScore = this.calculateKYCScore(promoteur);
        totalScore += (kycScore * weights.kyc) / 100;
        // 2. Documents Score
        const documentsScore = await this.calculateDocumentsScore(promoteurId);
        totalScore += (documentsScore * weights.documents) / 100;
        // 3. Updates Score
        const updatesScore = await this.calculateUpdatesScore(promoteurId, config);
        totalScore += (updatesScore * weights.updates) / 100;
        // 4. Response Time Score
        const responseScore = await this.calculateResponseScore(promoteurId, config);
        totalScore += (responseScore * weights.responseTime) / 100;
        // 5. Project Completion Score
        const completionScore = this.calculateCompletionScore(promoteur);
        totalScore += (completionScore * weights.projectCompletion) / 100;
        // 6. Badges Score
        const badgesScore = this.calculateBadgesScore(promoteur);
        totalScore += (badgesScore * weights.badges) / 100;
        // Apply bonuses
        const bonuses = await this.calculateBonuses(promoteurId, config);
        totalScore += bonuses;
        // Apply penalties
        const penalties = await this.calculatePenalties(promoteurId, config);
        totalScore -= penalties;
        // Normalize score
        totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));
        // Check for gaming
        const gamingDetected = await this.detectGaming(promoteurId, config);
        if (gamingDetected.isGaming) {
            totalScore = Math.max(0, totalScore - 20);
            await AuditLogService_1.AuditLogService.log({
                userId: 'system',
                action: 'gaming_detected',
                category: 'security',
                description: `Gaming detected for promoteur ${promoteurId}: ${gamingDetected.reason}`,
                severity: 'medium',
                targetModel: 'Promoteur',
                targetId: promoteurId,
            });
        }
        // Update promoteur trust score
        await Promoteur_1.default.findByIdAndUpdate(promoteurId, { trustScore: totalScore });
        // Persist snapshot
        try {
            await TrustScoreSnapshot_1.default.create({ promoteur: promoteurId, score: totalScore, createdAt: new Date() });
        }
        catch (e) {
            console.error('Error saving trust score snapshot:', e);
        }
        return {
            totalScore,
            breakdown: {
                kyc: kycScore,
                documents: documentsScore,
                updates: updatesScore,
                responseTime: responseScore,
                completion: completionScore,
                badges: badgesScore,
                bonuses,
                penalties,
            },
            gamingDetected,
        };
    }
    /**
     * Calculate KYC Score
     */
    static calculateKYCScore(promoteur) {
        switch (promoteur.kycStatus) {
            case 'verified': return 100;
            case 'submitted': return 50;
            case 'pending': return 25;
            case 'rejected': return 0;
            default: return 0;
        }
    }
    /**
     * Calculate Documents Score
     */
    static async calculateDocumentsScore(promoteurId) {
        const documents = await Document_1.default.find({ promoteur: promoteurId });
        if (documents.length === 0)
            return 0;
        const verifiedCount = documents.filter(d => d.verified).length;
        const expiredCount = documents.filter(d => d.status === 'expire').length;
        const missingCount = documents.filter(d => d.status === 'manquant').length;
        const baseScore = (verifiedCount / documents.length) * 100;
        const penalty = (expiredCount + missingCount) * 5;
        return Math.max(0, baseScore - penalty);
    }
    /**
     * Calculate Updates Score
     */
    static async calculateUpdatesScore(promoteurId, config) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const projects = await Project_1.default.find({ promoteur: promoteurId });
        if (projects.length === 0)
            return 50; // Neutral score if no projects
        let totalScore = 0;
        for (const project of projects) {
            const recentUpdates = await Update_1.default.find({
                project: project._id,
                createdAt: { $gte: thirtyDaysAgo },
                status: 'published',
            });
            if (recentUpdates.length === 0) {
                totalScore += 0;
            }
            else {
                // Score based on update frequency
                const daysSinceLastUpdate = project.updateFrequency || 30;
                if (daysSinceLastUpdate <= config.updateFrequency.ideal) {
                    totalScore += 100;
                }
                else if (daysSinceLastUpdate <= config.updateFrequency.minimum) {
                    totalScore += 70;
                }
                else {
                    totalScore += Math.max(0, 50 - (daysSinceLastUpdate - config.updateFrequency.minimum));
                }
            }
        }
        return totalScore / projects.length;
    }
    /**
     * Calculate Response Time Score
     */
    static async calculateResponseScore(promoteurId, config) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        const avgResponseTime = promoteur?.averageResponseTime;
        if (!avgResponseTime)
            return 50; // Neutral if no data
        const sla = config.responseTimeSLA;
        if (avgResponseTime <= sla.excellent)
            return 100;
        if (avgResponseTime <= sla.good)
            return 80;
        if (avgResponseTime <= sla.acceptable)
            return 60;
        return Math.max(0, 40 - (avgResponseTime - sla.acceptable) * 2);
    }
    /**
     * Calculate Completion Score
     */
    static calculateCompletionScore(promoteur) {
        if (promoteur.totalProjects === 0)
            return 50;
        const completionRate = promoteur.completedProjects / promoteur.totalProjects;
        return Math.round(completionRate * 100);
    }
    /**
     * Calculate Badges Score
     */
    static calculateBadgesScore(promoteur) {
        const badgeCount = promoteur.badges?.length || 0;
        return Math.min(100, badgeCount * 20);
    }
    /**
     * Calculate Bonuses
     */
    static async calculateBonuses(promoteurId, config) {
        let bonuses = 0;
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return 0;
        // Complete profile bonus
        if (promoteur.onboardingCompleted) {
            bonuses += config.bonusPoints.completeProfile;
        }
        // Quick responder bonus
        if (promoteur.averageResponseTime && promoteur.averageResponseTime <= 2) {
            bonuses += config.bonusPoints.quickResponder;
        }
        // Consistent updater bonus
        const projects = await Project_1.default.find({ promoteur: promoteurId });
        const allUpdatesRecent = projects.every(p => (p.updateFrequency || 30) <= 14);
        if (allUpdatesRecent && projects.length > 0) {
            bonuses += config.bonusPoints.consistentUpdater;
        }
        return bonuses;
    }
    /**
     * Calculate Penalties
     */
    static async calculatePenalties(promoteurId, config) {
        let penalties = 0;
        // Check for rejected documents
        const rejectedDocs = await Document_1.default.countDocuments({
            promoteur: promoteurId,
            status: 'manquant',
        });
        penalties += rejectedDocs * config.penalties.rejectedDocument;
        // Check for missed SLAs
        const missedSLAs = await Lead_1.default.countDocuments({
            promoteur: promoteurId,
            responseSLA: false,
        });
        penalties += missedSLAs * config.penalties.missedSLA;
        return Math.min(penalties, 30); // Cap penalties
    }
    /**
     * Detect Gaming/Manipulation
     */
    static async detectGaming(promoteurId, config) {
        if (!config.gamingDetection.suspiciousPatternsEnabled) {
            return { isGaming: false };
        }
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // Check for too many updates in a day
        const projects = await Project_1.default.find({ promoteur: promoteurId });
        for (const project of projects) {
            const updatesToday = await Update_1.default.countDocuments({
                project: project._id,
                createdAt: { $gte: oneDayAgo },
            });
            if (updatesToday > config.gamingDetection.maxDailyUpdates) {
                return {
                    isGaming: true,
                    reason: `Too many updates (${updatesToday}) in 24 hours for project ${project._id}`,
                };
            }
            // Check for rapid consecutive updates
            const recentUpdates = await Update_1.default.find({
                project: project._id,
                createdAt: { $gte: oneDayAgo },
            }).sort({ createdAt: 1 });
            for (let i = 1; i < recentUpdates.length; i++) {
                const timeDiff = recentUpdates[i].createdAt.getTime() -
                    recentUpdates[i - 1].createdAt.getTime();
                const hoursDiff = timeDiff / (60 * 60 * 1000);
                if (hoursDiff < config.gamingDetection.minUpdateIntervalHours) {
                    return {
                        isGaming: true,
                        reason: `Updates too close together (${hoursDiff.toFixed(1)} hours apart)`,
                    };
                }
            }
        }
        return { isGaming: false };
    }
    /**
     * Create or update config
     */
    static async saveConfig(name, configData, userId, setActive = false) {
        if (setActive) {
            // Deactivate all other configs
            await TrustScoreConfig_1.default.updateMany({}, { isActive: false });
        }
        const existing = await TrustScoreConfig_1.default.findOne({ name });
        if (existing) {
            Object.assign(existing, configData, { updatedBy: userId, isActive: setActive });
            await existing.save();
            return existing;
        }
        const config = new TrustScoreConfig_1.default({
            name,
            ...configData,
            createdBy: userId,
            isActive: setActive,
        });
        await config.save();
        return config;
    }
    /**
     * Recalculate all promoteur scores
     */
    static async recalculateAllScores() {
        const promoteurs = await Promoteur_1.default.find({});
        let updated = 0;
        for (const promoteur of promoteurs) {
            try {
                await this.calculateScore(promoteur._id.toString());
                updated++;
            }
            catch (error) {
                console.error(`Error calculating score for ${promoteur._id}:`, error);
            }
        }
        return updated;
    }
    /**
     * Apply a global correction (percentage multiplier) to all promoteur trust scores
     * Example: value = 10 => increase each score by 10% (score * 1.10), clamped to [0,100]
     */
    static async applyGlobalCorrection(value) {
        const promoteurs = await Promoteur_1.default.find({});
        let updated = 0;
        for (const promoteur of promoteurs) {
            try {
                const oldScore = Math.max(0, Math.min(100, Math.round(promoteur.trustScore || 0)));
                const newScore = Math.max(0, Math.min(100, Math.round(oldScore * (1 + value / 100))));
                if (newScore !== oldScore) {
                    promoteur.trustScore = newScore;
                    await promoteur.save();
                    updated++;
                }
            }
            catch (error) {
                console.error(`Error applying correction for ${promoteur._id}:`, error);
            }
        }
        return updated;
    }
    /**
     * Get score history (would need a ScoreHistory model in production)
     */
    static async getScoreHistory(promoteurId, days = 30) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        try {
            const snaps = await TrustScoreSnapshot_1.default.find({ promoteur: promoteurId, createdAt: { $gte: since } })
                .sort({ createdAt: 1 })
                .lean();
            if (!snaps || snaps.length === 0) {
                const promoteur = await Promoteur_1.default.findById(promoteurId).select('trustScore');
                return [{ date: new Date(), score: promoteur?.trustScore || 0 }];
            }
            return snaps.map(s => ({ date: s.createdAt, score: s.score }));
        }
        catch (e) {
            console.error('Error fetching score history:', e);
            const promoteur = await Promoteur_1.default.findById(promoteurId).select('trustScore');
            return [{ date: new Date(), score: promoteur?.trustScore || 0 }];
        }
    }
}
exports.AdvancedTrustScoreService = AdvancedTrustScoreService;
AdvancedTrustScoreService.defaultConfig = {
    weights: {
        kyc: 20,
        documents: 15,
        updates: 20,
        responseTime: 15,
        projectCompletion: 15,
        reviews: 10,
        badges: 5,
    },
    updateFrequency: {
        minimum: 30,
        ideal: 14,
        maxPenalty: 20,
    },
    responseTimeSLA: {
        excellent: 2,
        good: 8,
        acceptable: 24,
    },
    gamingDetection: {
        minUpdateIntervalHours: 4,
        maxDailyUpdates: 5,
        suspiciousPatternsEnabled: true,
    },
    bonusPoints: {
        verifiedBadge: 5,
        completeProfile: 3,
        quickResponder: 5,
        consistentUpdater: 5,
    },
    penalties: {
        noUpdatesWeek: 5,
        noUpdatesMonth: 15,
        missedSLA: 3,
        rejectedDocument: 5,
        complaint: 10,
    },
};
