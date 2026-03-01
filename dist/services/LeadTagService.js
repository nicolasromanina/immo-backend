"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadTagService = void 0;
const Lead_1 = __importDefault(require("../models/Lead"));
const NotificationService_1 = require("./NotificationService");
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
/**
 * Lead Tag Service
 * Manages lead tags: not-contacted, contacted, urgent, follow-up, etc.
 */
class LeadTagService {
    /**
     * Add tag to a lead
     */
    static async addTag(leadId, tag) {
        const lead = await Lead_1.default.findByIdAndUpdate(leadId, { $addToSet: { tags: tag } }, { new: true });
        return lead;
    }
    /**
     * Remove tag from a lead
     */
    static async removeTag(leadId, tag) {
        const lead = await Lead_1.default.findByIdAndUpdate(leadId, { $pull: { tags: tag } }, { new: true });
        return lead;
    }
    /**
     * Mark lead as contacted and remove 'not-contacted' tag
     */
    static async markAsContacted(leadId) {
        const lead = await Lead_1.default.findByIdAndUpdate(leadId, {
            $addToSet: { tags: this.STANDARD_TAGS.CONTACTED },
            $pull: { tags: this.STANDARD_TAGS.NOT_CONTACTED },
            firstContactDate: new Date(),
        }, { new: true });
        return lead;
    }
    /**
     * Get leads by tag (paginated)
     */
    static async getLeadsByTag(promoteurId, tag, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const leads = await Lead_1.default.find({
            promoteur: promoteurId,
            tags: tag,
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .populate('project', 'title slug')
            .populate('client', 'firstName lastName email');
        const total = await Lead_1.default.countDocuments({
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
    static async getLeadsByTags(promoteurId, tags, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const leads = await Lead_1.default.find({
            promoteur: promoteurId,
            tags: { $all: tags },
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .populate('project', 'title slug')
            .populate('client', 'firstName lastName email');
        const total = await Lead_1.default.countDocuments({
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
    static async processNotContactedReminders(dayThreshold = 2) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dayThreshold);
        // Find leads that:
        // 1. Have 'not-contacted' tag
        // 2. Were created more than X days ago
        // 3. Haven't already sent a reminder
        const leadsToNotify = await Lead_1.default.find({
            tags: this.STANDARD_TAGS.NOT_CONTACTED,
            createdAt: { $lte: cutoffDate },
            notContactedReminderSent: { $exists: false },
        })
            .populate('promoteur')
            .populate('project', 'title');
        console.log(`[LeadTagService] Found ${leadsToNotify.length} leads not contacted after ${dayThreshold} days`);
        for (const lead of leadsToNotify) {
            try {
                const promoteur = await Promoteur_1.default.findById(lead.promoteur).populate('user');
                if (promoteur?.user) {
                    // Send notification to promoteur
                    await NotificationService_1.NotificationService.notifyUncontactedLead({
                        promoteurUserId: promoteur.user._id.toString(),
                        leadId: lead._id.toString(),
                        projectTitle: lead.project?.title || 'Unknown Project',
                        leadName: `${lead.firstName} ${lead.lastName}`,
                        daysSinceCreation: dayThreshold,
                    });
                    // Mark reminder as sent
                    await Lead_1.default.findByIdAndUpdate(lead._id, {
                        notContactedReminderSent: new Date(),
                    });
                }
            }
            catch (error) {
                console.error(`[LeadTagService] Error processing reminder for lead ${lead._id}:`, error);
            }
        }
    }
    /**
     * Get tag statistics for a promoteur
     */
    static async getTagStats(promoteurId) {
        const stats = await Lead_1.default.aggregate([
            { $match: { promoteur: promoteurId } },
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);
        return stats;
    }
}
exports.LeadTagService = LeadTagService;
// Standard tags
LeadTagService.STANDARD_TAGS = {
    NOT_CONTACTED: 'not-contacted',
    CONTACTED: 'contacted',
    URGENT: 'urgent',
    FOLLOW_UP: 'follow-up',
    ARCHIVED: 'archived',
};
