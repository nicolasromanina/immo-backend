"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = require("../utils/emailService");
const WhatsAppService_1 = require("./WhatsAppService");
class NotificationService {
    /**
     * Create a notification
     */
    static async create(params) {
        // Backward compatibility:
        // some legacy callers pass recipient: 'admin' (string role) instead of a User ObjectId.
        // In that case, fan-out the notification to all admin users.
        if (params.recipient === 'admin') {
            const admins = await User_1.default.find({ roles: 'admin' }).select('_id');
            const payloads = admins.map((admin) => this.create({
                ...params,
                recipient: admin._id.toString(),
            }));
            return Promise.all(payloads);
        }
        const notification = new Notification_1.default({
            recipient: params.recipient,
            type: params.type,
            title: params.title,
            message: params.message,
            relatedProject: params.relatedProject,
            relatedLead: params.relatedLead,
            relatedUpdate: params.relatedUpdate,
            relatedAppeal: params.relatedAppeal,
            channels: params.channels || { inApp: true },
            actionUrl: params.actionUrl,
            actionLabel: params.actionLabel,
            priority: params.priority || 'medium',
            scheduledFor: params.scheduledFor,
            sentAt: !params.scheduledFor ? new Date() : undefined,
        });
        await notification.save();
        // Send through enabled channels
        const channels = params.channels || { inApp: true };
        if (channels.email) {
            try {
                // Resolve recipient email
                const user = await User_1.default.findById(params.recipient).select('email firstName');
                if (user?.email) {
                    await (0, emailService_1.sendEmail)({
                        to: user.email,
                        subject: params.title,
                        html: `<h2>${params.title}</h2><p>${params.message}</p>${params.actionUrl ? `<p><a href="${params.actionUrl}">${params.actionLabel || 'Voir'}</a></p>` : ''}`,
                        data: { ...params.data, name: user.firstName },
                    });
                }
            }
            catch (error) {
                console.error('[Notification] Email send failed:', error);
            }
        }
        if (channels.whatsapp) {
            try {
                const user = await User_1.default.findById(params.recipient).select('phone preferences');
                const phone = user?.phone;
                if (phone && user?.preferences?.notifications?.whatsapp !== false) {
                    await WhatsAppService_1.WhatsAppService.sendTextMessage(phone, `${params.title}\n\n${params.message}`);
                }
            }
            catch (error) {
                console.error('[Notification] WhatsApp send failed:', error);
            }
        }
        return notification;
    }
    /**
     * Send new lead notification to promoteur
     */
    static async notifyNewLead(params) {
        return this.create({
            recipient: params.promoteurUserId,
            type: 'lead',
            title: `Nouveau lead ${params.leadScore} reçu`,
            message: `${params.leadName} est intéressé par "${params.projectTitle}"`,
            relatedLead: params.leadId,
            channels: { inApp: true, email: true },
            actionUrl: `/leads/${params.leadId}`,
            actionLabel: 'Voir le lead',
            priority: params.leadScore === 'A' ? 'high' : 'medium',
        });
    }
    /**
     * Send project update notification to followers
     */
    static async notifyProjectUpdate(params) {
        const notifications = params.followerIds.map(userId => this.create({
            recipient: userId,
            type: 'update',
            title: 'Nouvelle mise à jour',
            message: `"${params.projectTitle}" a publié une mise à jour`,
            relatedProject: params.projectId,
            relatedUpdate: params.updateId,
            actionUrl: `/projects/${params.projectId}`,
            actionLabel: 'Voir la mise à jour',
            priority: 'low',
        }));
        return Promise.all(notifications);
    }
    /**
     * Send badge earned notification
     */
    static async notifyBadgeEarned(params) {
        return this.create({
            recipient: params.userId,
            type: 'badge',
            title: `Badge "${params.badgeName}" obtenu !`,
            message: params.badgeDescription,
            actionUrl: '/profile',
            actionLabel: 'Voir mon profil',
            priority: 'medium',
        });
    }
    /**
     * Send warning/sanction notification
     */
    static async notifyWarning(params) {
        return this.create({
            recipient: params.userId,
            type: 'warning',
            title: 'Action de modération',
            message: `${params.action}. Raison: ${params.reason}`,
            priority: 'urgent',
            channels: { inApp: true, email: true },
        });
    }
    /**
     * Get user's notifications
     */
    static async getUserNotifications(userId, filters) {
        const query = { recipient: userId };
        if (filters?.read !== undefined)
            query.read = filters.read;
        if (filters?.type)
            query.type = filters.type;
        const notifications = await Notification_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(filters?.limit || 50)
            .skip(filters?.skip || 0)
            .populate('relatedProject', 'title slug')
            .populate('relatedLead', 'firstName lastName')
            .populate('relatedUpdate', 'title');
        const total = await Notification_1.default.countDocuments(query);
        const unreadCount = await Notification_1.default.countDocuments({ recipient: userId, read: false });
        return { notifications, total, unreadCount };
    }
    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId, userId) {
        const notification = await Notification_1.default.findOneAndUpdate({ _id: notificationId, recipient: userId }, { read: true, readAt: new Date() }, { new: true });
        return notification;
    }
    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(userId) {
        const result = await Notification_1.default.updateMany({ recipient: userId, read: false }, { read: true, readAt: new Date() });
        return result;
    }
    /**
     * Delete notification
     */
    static async deleteNotification(notificationId, userId) {
        const result = await Notification_1.default.findOneAndDelete({
            _id: notificationId,
            recipient: userId,
        });
        return result;
    }
    /**
     * Alias for create - for backward compatibility
     */
    static async createNotification(params) {
        return this.create({
            recipient: params.user.toString(),
            type: params.type,
            title: params.title,
            message: params.message,
            priority: params.priority,
            actionUrl: params.link,
        });
    }
    /**
     * Send notification to all admins
     */
    static async createAdminNotification(params) {
        // Find all admin users
        const admins = await User_1.default.find({ roles: 'admin' });
        const notifications = admins.map(admin => this.create({
            recipient: admin._id.toString(),
            type: params.type,
            title: params.title,
            message: params.message,
            priority: params.priority || 'medium',
            actionUrl: params.link,
        }));
        return Promise.all(notifications);
    }
    /**
     * Notify promoteur that a lead has not been contacted after X days
     */
    static async notifyUncontactedLead(params) {
        return this.create({
            recipient: params.promoteurUserId,
            type: 'reminder',
            title: `Lead non contacté après ${params.daysSinceCreation} jours`,
            message: `${params.leadName} depuis le projet "${params.projectTitle}" n'a pas encore été contacté.`,
            relatedLead: params.leadId,
            priority: 'high',
            actionUrl: `/crm/leads/${params.leadId}`,
            actionLabel: 'Voir le lead',
            channels: {
                email: true,
                inApp: true,
            },
        });
    }
}
exports.NotificationService = NotificationService;
