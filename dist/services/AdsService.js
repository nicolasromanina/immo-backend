"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdsService = void 0;
const Ad_1 = __importDefault(require("../models/Ad"));
const NotificationService_1 = require("./NotificationService");
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
class AdsService {
    /**
     * Create a new ad campaign
     */
    static async createAd(promoteurId, data) {
        // Expect budget in cents. Default to 10000 (100€) when not provided.
        const budgetAmount = typeof data.budget === 'number' ? data.budget : data.budget?.totalBudget || 10000;
        // Calculate campaign duration based on budget and a daily spend estimate (in cents)
        const dailySpendEstimate = Number(process.env.DAILY_SPEND_ESTIMATE_CENTS) || 200; // default 200 cents = 2€/day
        const durationDays = Math.max(1, Math.floor(budgetAmount / dailySpendEstimate));
        const scheduleStart = new Date();
        const scheduleEnd = new Date(scheduleStart.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const ad = await Ad_1.default.create({
            promoteur: promoteurId,
            project: data.project,
            title: data.title,
            description: data.description || '',
            type: data.type || 'spotlight',
            targeting: data.targeting || {},
            budget: {
                totalBudget: budgetAmount,
                spent: 0,
                currency: 'EUR',
            },
            schedule: data.schedule || {
                startDate: scheduleStart,
                endDate: scheduleEnd,
            },
            creative: data.creative || { linkUrl: '' },
            status: 'draft',
            metrics: { impressions: 0, clicks: 0, conversions: 0, ctr: 0 },
        });
        return ad;
    }
    /**
     * Submit ad for review
     */
    static async submitForReview(adId, promoteurId) {
        const ad = await Ad_1.default.findOneAndUpdate({ _id: adId, promoteur: promoteurId, status: 'draft' }, { status: 'pending-review' }, { new: true });
        if (!ad)
            throw new Error('Annonce non trouvée ou non modifiable');
        await NotificationService_1.NotificationService.createAdminNotification({
            type: 'system',
            title: 'Nouvelle annonce à vérifier',
            message: `Annonce "${ad.title}" soumise pour validation`,
            priority: 'medium',
            link: `/admin/ads/${ad._id}`,
        });
        return ad;
    }
    /**
     * Approve ad (admin)
     */
    static async approveAd(adId, reviewerId) {
        const ad = await Ad_1.default.findByIdAndUpdate(adId, {
            status: 'active',
            reviewedBy: reviewerId,
        }, { new: true });
        if (ad) {
            const promoteur = await Promoteur_1.default.findById(ad.promoteur).populate('user');
            if (promoteur?.user) {
                await NotificationService_1.NotificationService.create({
                    recipient: promoteur.user._id.toString(),
                    type: 'system',
                    title: 'Annonce approuvée',
                    message: `Votre annonce "${ad.title}" a été approuvée et sera diffusée.`,
                    channels: { inApp: true, email: true },
                });
            }
        }
        return ad;
    }
    /**
     * Reject ad (admin)
     */
    static async rejectAd(adId, reviewerId, reason) {
        const ad = await Ad_1.default.findByIdAndUpdate(adId, {
            status: 'rejected',
            reviewedBy: reviewerId,
            rejectionReason: reason,
        }, { new: true });
        if (ad) {
            const promoteur = await Promoteur_1.default.findById(ad.promoteur).populate('user');
            if (promoteur?.user) {
                await NotificationService_1.NotificationService.create({
                    recipient: promoteur.user._id.toString(),
                    type: 'system',
                    title: 'Annonce refusée',
                    message: `Votre annonce "${ad.title}" a été refusée: ${reason}`,
                    priority: 'high',
                    channels: { inApp: true, email: true },
                });
            }
        }
        return ad;
    }
    /**
     * Pause ad
     */
    static async pauseAd(adId, promoteurId) {
        return Ad_1.default.findOneAndUpdate({ _id: adId, promoteur: promoteurId, status: 'active' }, { status: 'paused' }, { new: true });
    }
    /**
     * Resume ad
     */
    static async resumeAd(adId, promoteurId) {
        return Ad_1.default.findOneAndUpdate({ _id: adId, promoteur: promoteurId, status: 'paused' }, { status: 'active' }, { new: true });
    }
    /**
     * Track impression
     */
    static async trackImpression(adId) {
        const ad = await Ad_1.default.findByIdAndUpdate(adId, {
            $inc: { 'metrics.impressions': 1 },
        }, { new: true });
        if (ad && ad.metrics.impressions > 0) {
            ad.metrics.ctr = (ad.metrics.clicks / ad.metrics.impressions) * 100;
            await ad.save();
        }
        return ad;
    }
    /**
     * Track click
     */
    static async trackClick(adId) {
        const ad = await Ad_1.default.findByIdAndUpdate(adId, {
            $inc: { 'metrics.clicks': 1 },
        }, { new: true });
        if (ad && ad.metrics.impressions > 0) {
            ad.metrics.ctr = (ad.metrics.clicks / ad.metrics.impressions) * 100;
            await ad.save();
        }
        return ad;
    }
    /**
     * Track conversion
     */
    static async trackConversion(adId) {
        return Ad_1.default.findByIdAndUpdate(adId, {
            $inc: { 'metrics.conversions': 1 },
        }, { new: true });
    }
    /**
     * Get ads for promoteur - tries promoteurId (Promoteur._id) first, then userId (User._id) for backward compatibility
     */
    static async getPromoteurAds(promoteurId, userId, filters) {
        const filterQuery = {};
        if (filters?.status)
            filterQuery.status = filters.status;
        if (filters?.type)
            filterQuery.type = filters.type;
        // Try with promoteurId (Promoteur._id) first
        const query1 = { promoteur: promoteurId, ...filterQuery };
        let ads = await Ad_1.default.find(query1)
            .populate({ path: 'project', select: 'nom city priceFrom currency images coverImage' })
            .sort({ createdAt: -1 });
        // If no results and userId provided, fallback to userId (User._id) for backward compatibility
        if (ads.length === 0 && userId && userId !== promoteurId) {
            const query2 = { promoteur: userId, ...filterQuery };
            ads = await Ad_1.default.find(query2)
                .populate({ path: 'project', select: 'nom city priceFrom currency images coverImage' })
                .sort({ createdAt: -1 });
        }
        return ads;
    }
    /**
     * Get all ads (admin)
     */
    static async getAllAds(filters) {
        const query = {};
        if (filters?.status)
            query.status = filters.status;
        if (filters?.type)
            query.type = filters.type;
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const ads = await Ad_1.default.find(query)
            .populate('promoteur', 'organizationName name email')
            .populate({ path: 'project', select: 'title slug priceFrom currency promoteur', populate: { path: 'promoteur', select: 'organizationName name' } })
            .populate('reviewedBy', 'email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        const total = await Ad_1.default.countDocuments(query);
        return { ads, pagination: { total, page, pages: Math.ceil(total / limit) } };
    }
    /**
     * Pause ad as admin (force pause regardless of promoteur)
     */
    static async pauseAdAdmin(adId) {
        return Ad_1.default.findByIdAndUpdate(adId, { status: 'paused' }, { new: true });
    }
    /**
     * Resume ad as admin (force resume regardless of promoteur)
     */
    static async resumeAdAdmin(adId) {
        return Ad_1.default.findByIdAndUpdate(adId, { status: 'active' }, { new: true });
    }
    /**
     * Get active ads for targeting
     */
    static async getActiveAdsForDisplay(criteria) {
        const now = new Date();
        const query = {
            status: 'active',
            'schedule.startDate': { $lte: now },
            'schedule.endDate': { $gte: now },
        };
        if (criteria.type)
            query.type = criteria.type;
        const ads = await Ad_1.default.find(query)
            .populate('project', 'nom city prix images')
            .lean();
        // Filter by targeting
        return ads.filter(ad => {
            if (criteria.city && ad.targeting.cities?.length) {
                if (!ad.targeting.cities.includes(criteria.city))
                    return false;
            }
            if (criteria.country && ad.targeting.countries?.length) {
                if (!ad.targeting.countries.includes(criteria.country))
                    return false;
            }
            // Check budget
            if (ad.budget.spent >= ad.budget.totalBudget)
                return false;
            return true;
        });
    }
    /**
     * Get 7-day stats for an ad
     */
    static async get7DayStats(adId) {
        const ad = await Ad_1.default.findById(adId);
        if (!ad)
            throw new Error('Annonce non trouvée');
        // Get last 7 days of stats
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        // Filter dailyStats to only include last 7 days
        const stats = ad.dailyStats
            .filter(stat => new Date(stat.date) >= sevenDaysAgo)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return stats;
    }
    /**
     * Update daily stats for an ad (called by tracking or cron job)
     */
    static async updateDailyStats(adId, date = new Date()) {
        // Normalize date to start of day (00:00:00)
        const dayStart = new Date(date);
        dayStart.setUTCHours(0, 0, 0, 0);
        const ad = await Ad_1.default.findById(adId);
        if (!ad)
            throw new Error('Annonce non trouvée');
        // Find or create daily stat for this date
        const existingStatIndex = ad.dailyStats.findIndex(stat => {
            const statDate = new Date(stat.date);
            statDate.setUTCHours(0, 0, 0, 0);
            return statDate.getTime() === dayStart.getTime();
        });
        if (existingStatIndex >= 0) {
            // Update existing stat (ensure it has today's data updated from metrics)
            ad.dailyStats[existingStatIndex].impressions = ad.metrics.impressions;
            ad.dailyStats[existingStatIndex].clicks = ad.metrics.clicks;
        }
        else {
            // Create new daily stat
            ad.dailyStats.push({
                date: dayStart,
                impressions: ad.metrics.impressions,
                clicks: ad.metrics.clicks,
                spent: ad.budget.spent,
            });
        }
        // Keep only last 60 days of detailed stats
        const sixtyDaysAgo = new Date(new Date().getTime() - 60 * 24 * 60 * 60 * 1000);
        ad.dailyStats = ad.dailyStats.filter(stat => new Date(stat.date) >= sixtyDaysAgo);
        await ad.save();
        return ad;
    }
}
exports.AdsService = AdsService;
