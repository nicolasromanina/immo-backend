import Ad, { IAd } from '../models/Ad';
import { NotificationService } from './NotificationService';
import Promoteur from '../models/Promoteur';

export class AdsService {
  /**
   * Create a new ad campaign
   */
  static async createAd(promoteurId: string, data: Partial<IAd>) {
    const ad = await Ad.create({
      ...data,
      promoteur: promoteurId,
      status: 'draft',
      metrics: { impressions: 0, clicks: 0, conversions: 0, ctr: 0 },
      budget: { ...data.budget, spent: 0 },
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
   * Get ads for promoteur
   */
  static async getPromoteurAds(promoteurId: string, filters?: { status?: string; type?: string }) {
    const query: any = { promoteur: promoteurId };
    if (filters?.status) query.status = filters.status;
    if (filters?.type) query.type = filters.type;
    return Ad.find(query).populate('project', 'nom city').sort({ createdAt: -1 });
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
      .populate('promoteur', 'organizationName')
      .populate('project', 'nom city')
      .populate('reviewedBy', 'email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Ad.countDocuments(query);
    return { ads, pagination: { total, page, pages: Math.ceil(total / limit) } };
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
   * Expire outdated ads (cron)
   */
  static async expireOutdatedAds() {
    const now = new Date();
    const result = await Ad.updateMany(
      { status: 'active', 'schedule.endDate': { $lt: now } },
      { status: 'expired' }
    );
    return result.modifiedCount;
  }
}
