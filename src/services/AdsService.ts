import Ad, { IAd } from '../models/Ad';
import { NotificationService } from './NotificationService';
import Promoteur from '../models/Promoteur';

export class AdsService {
  /**
   * Create a new ad campaign
   */
  static async createAd(promoteurId: string, data: Partial<IAd>) {
    // Expect budget in cents. Default to 10000 (100€) when not provided.
    const budgetAmount = typeof data.budget === 'number' ? data.budget : (data.budget as any)?.totalBudget || 10000;
    // Calculate campaign duration based on budget and a daily spend estimate (in cents)
    const dailySpendEstimate = Number(process.env.DAILY_SPEND_ESTIMATE_CENTS) || 200; // default 200 cents = 2€/day
    const durationDays = Math.max(1, Math.floor(budgetAmount / dailySpendEstimate));
    const scheduleStart = new Date();
    const scheduleEnd = new Date(scheduleStart.getTime() + durationDays * 24 * 60 * 60 * 1000);
    
    const ad = await Ad.create({
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
  static async submitForReview(adId: string, promoteurId: string) {
    const ad = await Ad.findOneAndUpdate(
      { _id: adId, promoteur: promoteurId, status: 'draft' },
      { status: 'pending-review' },
      { new: true }
    );
    if (!ad) throw new Error('Annonce non trouvée ou non modifiable');

    await NotificationService.createAdminNotification({
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
  static async approveAd(adId: string, reviewerId: string) {
    const ad = await Ad.findByIdAndUpdate(adId, {
      status: 'active',
      reviewedBy: reviewerId,
    }, { new: true });

    if (ad) {
      const promoteur = await Promoteur.findById(ad.promoteur).populate('user');
      if (promoteur?.user) {
        await NotificationService.create({
          recipient: (promoteur.user as any)._id.toString(),
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
  static async rejectAd(adId: string, reviewerId: string, reason: string) {
    const ad = await Ad.findByIdAndUpdate(adId, {
      status: 'rejected',
      reviewedBy: reviewerId,
      rejectionReason: reason,
    }, { new: true });

    if (ad) {
      const promoteur = await Promoteur.findById(ad.promoteur).populate('user');
      if (promoteur?.user) {
        await NotificationService.create({
          recipient: (promoteur.user as any)._id.toString(),
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
  static async pauseAd(adId: string, promoteurId: string) {
    return Ad.findOneAndUpdate(
      { _id: adId, promoteur: promoteurId, status: 'active' },
      { status: 'paused' },
      { new: true }
    );
  }

  /**
   * Resume ad
   */
  static async resumeAd(adId: string, promoteurId: string) {
    return Ad.findOneAndUpdate(
      { _id: adId, promoteur: promoteurId, status: 'paused' },
      { status: 'active' },
      { new: true }
    );
  }

  /**
   * Track impression
   */
  static async trackImpression(adId: string) {
    const ad = await Ad.findByIdAndUpdate(adId, {
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
  static async trackClick(adId: string) {
    const ad = await Ad.findByIdAndUpdate(adId, {
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
  static async trackConversion(adId: string) {
    return Ad.findByIdAndUpdate(adId, {
      $inc: { 'metrics.conversions': 1 },
    }, { new: true });
  }

  /**
   * Get ads for promoteur - tries promoteurId (Promoteur._id) first, then userId (User._id) for backward compatibility
   */
  static async getPromoteurAds(promoteurId: string, userId?: string, filters?: { status?: string; type?: string }) {
    const filterQuery: any = {};
    if (filters?.status) filterQuery.status = filters.status;
    if (filters?.type) filterQuery.type = filters.type;
    
    // Try with promoteurId (Promoteur._id) first
    const query1: any = { promoteur: promoteurId, ...filterQuery };
    let ads = await Ad.find(query1)
      .populate({ path: 'project', select: 'nom city priceFrom currency images coverImage' })
      .sort({ createdAt: -1 });
    
    // If no results and userId provided, fallback to userId (User._id) for backward compatibility
    if (ads.length === 0 && userId && userId !== promoteurId) {
      const query2: any = { promoteur: userId, ...filterQuery };
      ads = await Ad.find(query2)
        .populate({ path: 'project', select: 'nom city priceFrom currency images coverImage' })
        .sort({ createdAt: -1 });
    }
    
    return ads;
  }

  /**
   * Get all ads (admin)
   */
  static async getAllAds(filters?: { status?: string; type?: string; page?: number; limit?: number }) {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.type) query.type = filters.type;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const ads = await Ad.find(query)
      .populate('promoteur', 'organizationName name email')
      .populate({ path: 'project', select: 'title slug priceFrom currency promoteur', populate: { path: 'promoteur', select: 'organizationName name' } })
      .populate('reviewedBy', 'email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Ad.countDocuments(query);
    return { ads, pagination: { total, page, pages: Math.ceil(total / limit) } };
  }

  /**
   * Pause ad as admin (force pause regardless of promoteur)
   */
  static async pauseAdAdmin(adId: string) {
    return Ad.findByIdAndUpdate(adId, { status: 'paused' }, { new: true });
  }

  /**
   * Resume ad as admin (force resume regardless of promoteur)
   */
  static async resumeAdAdmin(adId: string) {
    return Ad.findByIdAndUpdate(adId, { status: 'active' }, { new: true });
  }

  /**
   * Get active ads for targeting
   */
  static async getActiveAdsForDisplay(criteria: { city?: string; country?: string; type?: string }) {
    const now = new Date();
    const query: any = {
      status: 'active',
      'schedule.startDate': { $lte: now },
      'schedule.endDate': { $gte: now },
    };

    if (criteria.type) query.type = criteria.type;

    const ads = await Ad.find(query)
      .populate('project', 'nom city prix images')
      .lean();

    // Filter by targeting
    return ads.filter(ad => {
      if (criteria.city && ad.targeting.cities?.length) {
        if (!ad.targeting.cities.includes(criteria.city)) return false;
      }
      if (criteria.country && ad.targeting.countries?.length) {
        if (!ad.targeting.countries.includes(criteria.country)) return false;
      }
      // Check budget
      if (ad.budget.spent >= ad.budget.totalBudget) return false;
      return true;
    });
  }

  /**
   * Get 7-day stats for an ad
   */
  static async get7DayStats(adId: string) {
    const ad = await Ad.findById(adId);
    if (!ad) throw new Error('Annonce non trouvée');
    
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
  static async updateDailyStats(adId: string, date: Date = new Date()) {
    // Normalize date to start of day (00:00:00)
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    
    const ad = await Ad.findById(adId);
    if (!ad) throw new Error('Annonce non trouvée');
    
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
    } else {
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
