import Lead from '../models/Lead';
import { NotificationService } from './NotificationService';
import Promoteur from '../models/Promoteur';

/**
 * Lead Tag Service
 * Manages lead tags: not-contacted, contacted, urgent, follow-up, etc.
 */
export class LeadTagService {
  // Standard tags
  static readonly STANDARD_TAGS = {
    NOT_CONTACTED: 'not-contacted',
    CONTACTED: 'contacted',
    URGENT: 'urgent',
    FOLLOW_UP: 'follow-up',
    ARCHIVED: 'archived',
  };

  /**
   * Add tag to a lead
   */
  static async addTag(leadId: string, tag: string): Promise<any> {
    const lead = await Lead.findByIdAndUpdate(
      leadId,
      { $addToSet: { tags: tag } },
      { new: true }
    );
    return lead;
  }

  /**
   * Remove tag from a lead
   */
  static async removeTag(leadId: string, tag: string): Promise<any> {
    const lead = await Lead.findByIdAndUpdate(
      leadId,
      { $pull: { tags: tag } },
      { new: true }
    );
    return lead;
  }

  /**
   * Mark lead as contacted and remove 'not-contacted' tag
   */
  static async markAsContacted(leadId: string): Promise<any> {
    const lead = await Lead.findByIdAndUpdate(
      leadId,
      {
        $addToSet: { tags: this.STANDARD_TAGS.CONTACTED },
        $pull: { tags: this.STANDARD_TAGS.NOT_CONTACTED },
        firstContactDate: new Date(),
      },
      { new: true }
    );
    return lead;
  }

  /**
   * Get leads by tag (paginated)
   */
  static async getLeadsByTag(
    promoteurId: string,
    tag: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const leads = await Lead.find({
      promoteur: promoteurId,
      tags: tag,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('project', 'title slug')
      .populate('client', 'firstName lastName email');

    const total = await Lead.countDocuments({
      promoteur: promoteurId,
      tags: tag,
    });

    return {
      leads,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  /**
   * Get all leads with multiple tag filters (AND logic)
   */
  static async getLeadsByTags(
    promoteurId: string,
    tags: string[],
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const leads = await Lead.find({
      promoteur: promoteurId,
      tags: { $all: tags },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('project', 'title slug')
      .populate('client', 'firstName lastName email');

    const total = await Lead.countDocuments({
      promoteur: promoteurId,
      tags: { $all: tags },
    });

    return {
      leads,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  /**
   * Find all leads not contacted after X days and send reminder
   * Called by a scheduled job (cron)
   */
  static async processNotContactedReminders(dayThreshold: number = 2): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dayThreshold);

    // Find leads that:
    // 1. Have 'not-contacted' tag
    // 2. Were created more than X days ago
    // 3. Haven't already sent a reminder
    const leadsToNotify = await Lead.find({
      tags: this.STANDARD_TAGS.NOT_CONTACTED,
      createdAt: { $lte: cutoffDate },
      notContactedReminderSent: { $exists: false },
    })
      .populate('promoteur')
      .populate('project', 'title');

    console.log(
      `[LeadTagService] Found ${leadsToNotify.length} leads not contacted after ${dayThreshold} days`
    );

    for (const lead of leadsToNotify) {
      try {
        const promoteur = await Promoteur.findById(lead.promoteur).populate('user');

        if (promoteur?.user) {
          // Send notification to promoteur
          await NotificationService.notifyUncontactedLead({
            promoteurUserId: (promoteur.user as any)._id.toString(),
            leadId: lead._id.toString(),
            projectTitle: (lead.project as any)?.title || 'Unknown Project',
            leadName: `${lead.firstName} ${lead.lastName}`,
            daysSinceCreation: dayThreshold,
          });

          // Mark reminder as sent
          await Lead.findByIdAndUpdate(lead._id, {
            notContactedReminderSent: new Date(),
          });
        }
      } catch (error) {
        console.error(
          `[LeadTagService] Error processing reminder for lead ${lead._id}:`,
          error
        );
      }
    }
  }

  /**
   * Get tag statistics for a promoteur
   */
  static async getTagStats(promoteurId: string): Promise<any> {
    const stats = await Lead.aggregate([
      { $match: { promoteur: promoteurId } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return stats;
  }
}
