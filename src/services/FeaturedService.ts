import FeaturedSlot from '../models/FeaturedSlot';
import Project from '../models/Project';
import Promoteur from '../models/Promoteur';
import TrustScoreConfig from '../models/TrustScoreConfig';
import mongoose from 'mongoose';

export class FeaturedService {
  /**
   * Get active featured items for a placement
   */
  static async getFeaturedItems(
    placement: 'annuaires' | 'search' | 'newsletter' | 'category' | 'city',
    options?: {
      country?: string;
      city?: string;
      category?: string;
      limit?: number;
    }
  ) {
    const now = new Date();
    const query: any = {
      placement,
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    if (options?.country) query.country = options.country;
    if (options?.city) query.city = options.city;
    if (options?.category) query.category = options.category;

    const slots = await FeaturedSlot.find(query)
      .sort({ position: 1 })
      .limit(options?.limit || 10)
      .populate({
        path: 'entity',
        select: 'title slug coverImage priceFrom city trustScore organizationName logo',
      });

    // Track impressions
    await FeaturedSlot.updateMany(
      { _id: { $in: slots.map(s => s._id) } },
      { $inc: { impressions: 1 } }
    );

    return slots.map(slot => ({
      ...slot.toObject(),
      entityData: slot.entity,
    }));
  }

  /**
   * Create a featured slot
   */
  static async createFeaturedSlot(data: {
    entityType: 'project' | 'promoteur';
    entityId: string;
    placement: string;
    position?: number;
    startDate: Date;
    endDate: Date;
    type: 'automatic' | 'manual' | 'paid';
    country?: string;
    city?: string;
    category?: string;
    notes?: string;
    createdBy: string;
    payment?: {
      amount: number;
      currency: string;
    };
  }) {
    const slot = new FeaturedSlot({
      entityType: data.entityType,
      entity: data.entityId,
      placement: data.placement,
      position: data.position || 0,
      startDate: data.startDate,
      endDate: data.endDate,
      type: data.type,
      country: data.country,
      city: data.city,
      category: data.category,
      notes: data.notes,
      createdBy: data.createdBy,
      status: data.startDate <= new Date() ? 'active' : 'scheduled',
      payment: data.payment,
    });

    await slot.save();

    // Update project/promoteur isFeatured flag
    if (data.entityType === 'project') {
      await Project.findByIdAndUpdate(data.entityId, {
        isFeatured: true,
        featuredUntil: data.endDate,
      });
    }

    return slot;
  }

  /**
   * Cancel a featured slot
   */
  static async cancelFeaturedSlot(slotId: string) {
    const slot = await FeaturedSlot.findByIdAndUpdate(
      slotId,
      { status: 'cancelled' },
      { new: true }
    );

    if (slot) {
      // Check if there are other active slots for this entity
      const otherSlots = await FeaturedSlot.countDocuments({
        entity: slot.entity,
        entityType: slot.entityType,
        status: 'active',
        _id: { $ne: slotId },
      });

      if (otherSlots === 0 && slot.entityType === 'project') {
        await Project.findByIdAndUpdate(slot.entity, {
          isFeatured: false,
          featuredUntil: undefined,
        });
      }
    }

    return slot;
  }

  /**
   * Track click on featured item
   */
  static async trackClick(slotId: string) {
    await FeaturedSlot.findByIdAndUpdate(slotId, {
      $inc: { clicks: 1 },
    });
  }

  /**
   * Get top verified projects
   */
  static async getTopVerifiedProjects(options?: {
    country?: string;
    city?: string;
    limit?: number;
  }) {
    const query: any = {
      publicationStatus: 'published',
      status: { $nin: ['archive', 'suspended'] },
    };

    if (options?.country) query.country = options.country;
    if (options?.city) query.city = options.city;

    return Project.find(query)
      .populate('promoteur', 'organizationName complianceStatus trustScore badges')
      .sort({ trustScore: -1, views: -1 })
      .limit(options?.limit || 10);
  }

  /**
   * Get new projects
   */
  static async getNewProjects(options?: {
    country?: string;
    city?: string;
    limit?: number;
    days?: number;
  }) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - (options?.days || 30));

    const query: any = {
      publicationStatus: 'published',
      status: { $nin: ['archive', 'suspended'] },
      createdAt: { $gte: daysAgo },
    };

    if (options?.country) query.country = options.country;
    if (options?.city) query.city = options.city;

    return Project.find(query)
      .populate('promoteur', 'organizationName complianceStatus trustScore')
      .sort({ createdAt: -1 })
      .limit(options?.limit || 10);
  }

  /**
   * Auto-feature projects based on trust score
   */
  static async autoFeatureTopProjects() {
    const config = await TrustScoreConfig.findOne({ isActive: true });
    const minScore = config?.thresholds?.villa?.verifieMin || 70;

    // Get top projects that are not already featured
    const topProjects = await Project.find({
      publicationStatus: 'published',
      status: { $nin: ['archive', 'suspended'] },
      trustScore: { $gte: minScore },
      isFeatured: false,
    })
      .sort({ trustScore: -1 })
      .limit(5);

    const now = new Date();
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    for (const project of topProjects) {
      await this.createFeaturedSlot({
        entityType: 'project',
        entityId: project._id.toString(),
        placement: 'annuaires',
        startDate: now,
        endDate,
        type: 'automatic',
        createdBy: 'system',
      });
    }

    return topProjects.length;
  }

  /**
   * Update slot statuses (cron job)
   */
  static async updateSlotStatuses() {
    const now = new Date();

    // Activate scheduled slots
    await FeaturedSlot.updateMany(
      {
        status: 'scheduled',
        startDate: { $lte: now },
      },
      { status: 'active' }
    );

    // Expire active slots
    const expiredSlots = await FeaturedSlot.find({
      status: 'active',
      endDate: { $lt: now },
    });

    await FeaturedSlot.updateMany(
      { _id: { $in: expiredSlots.map(s => s._id) } },
      { status: 'expired' }
    );

    // Update isFeatured flags for expired projects
    for (const slot of expiredSlots) {
      if (slot.entityType === 'project') {
        const otherActiveSlots = await FeaturedSlot.countDocuments({
          entity: slot.entity,
          entityType: 'project',
          status: 'active',
        });

        if (otherActiveSlots === 0) {
          await Project.findByIdAndUpdate(slot.entity, {
            isFeatured: false,
            featuredUntil: undefined,
          });
        }
      }
    }

    return expiredSlots.length;
  }

  /**
   * Get featured slot performance
   */
  static async getSlotPerformance(slotId: string) {
    const slot = await FeaturedSlot.findById(slotId);
    if (!slot) return null;

    const ctr = slot.impressions > 0 ? (slot.clicks / slot.impressions) * 100 : 0;

    return {
      ...slot.toObject(),
      performance: {
        impressions: slot.impressions,
        clicks: slot.clicks,
        ctr: Math.round(ctr * 100) / 100,
      },
    };
  }

  /**
   * Get all slots (admin)
   */
  static async getAllSlots(filters: {
    placement?: string;
    status?: string;
    entityType?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    
    if (filters.placement) query.placement = filters.placement;
    if (filters.status) query.status = filters.status;
    if (filters.entityType) query.entityType = filters.entityType;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    console.debug('[FEATURED][SRV] getAllSlots query', { query: { ...query }, page, limit, skip });

    const slots = await FeaturedSlot.find(query)
      .populate('entity', 'title organizationName plan subscriptionStatus logo')
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await FeaturedSlot.countDocuments(query);

    console.debug('[FEATURED][SRV] getAllSlots db result', {
      total,
      slotsCount: Array.isArray(slots) ? slots.length : 0,
      sampleIds: Array.isArray(slots) ? slots.slice(0,5).map(s => (s as any)._id) : [],
    });

    return {
      slots,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  /**
   * Approve a slot (admin)
   */
  static async approveSlot(slotId: string) {
    const slot = await FeaturedSlot.findById(slotId);
    if (!slot) return null;

    slot.status = 'active';
    await slot.save();

    // If slot relates to a project, ensure project isFeatured is set
    if (slot.entityType === 'project') {
      await Project.findByIdAndUpdate(slot.entity, {
        isFeatured: true,
        featuredUntil: slot.endDate,
      });
    }

    return slot;
  }

  /**
   * Reject a slot (admin) — set cancelled with optional reason
   */
  static async rejectSlot(slotId: string, reason?: string) {
    const slot = await FeaturedSlot.findById(slotId);
    if (!slot) return null;

    slot.status = 'cancelled';
    if (reason) slot.notes = `${slot.notes || ''}\n[Admin rejection] ${reason}`.trim();
    await slot.save();

    // If project, clear isFeatured if no other active slots
    if (slot.entityType === 'project') {
      const otherActive = await FeaturedSlot.countDocuments({
        entity: slot.entity,
        entityType: 'project',
        status: 'active',
        _id: { $ne: slotId },
      });

      if (otherActive === 0) {
        await Project.findByIdAndUpdate(slot.entity, {
          isFeatured: false,
          featuredUntil: undefined,
        });
      }
    }

    return slot;
  }

  /**
   * Update a slot (admin)
   */
  static async updateSlot(slotId: string, data: Partial<any>) {
    const slot = await FeaturedSlot.findByIdAndUpdate(slotId, data, { new: true });

    if (!slot) return null;

    // If dates changed and slot active, ensure project flag matches
    if (slot.entityType === 'project') {
      const activeSlots = await FeaturedSlot.countDocuments({
        entity: slot.entity,
        entityType: 'project',
        status: 'active',
      });

      if (activeSlots > 0) {
        await Project.findByIdAndUpdate(slot.entity, {
          isFeatured: true,
          featuredUntil: slot.endDate,
        });
      } else {
        await Project.findByIdAndUpdate(slot.entity, {
          isFeatured: false,
          featuredUntil: undefined,
        });
      }
    }

    return slot;
  }
}
