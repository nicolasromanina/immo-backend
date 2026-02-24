"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrisisService = void 0;
const CrisisAlert_1 = __importDefault(require("../models/CrisisAlert"));
const NotificationService_1 = require("./NotificationService");
const emailService_1 = require("../utils/emailService");
const User_1 = __importDefault(require("../models/User"));
class CrisisService {
    /**
     * Declare a crisis
     */
    static async declareCrisis(data) {
        const crisis = await CrisisAlert_1.default.create({
            ...data,
            status: 'detected',
        });
        // Notify all admins immediately
        const admins = await User_1.default.find({ role: { $in: ['admin', 'manager'] }, isActive: true });
        for (const admin of admins) {
            await NotificationService_1.NotificationService.create({
                recipient: admin._id.toString(),
                type: 'warning',
                title: `🚨 Crise: ${data.title}`,
                message: `Niveau: ${data.severity.toUpperCase()} — ${data.description}`,
                priority: 'urgent',
                channels: { inApp: true, email: true, whatsapp: data.severity === 'critical' },
                actionUrl: `/admin/crisis/${crisis._id}`,
            });
        }
        return crisis;
    }
    /**
     * Update crisis status
     */
    static async updateStatus(crisisId, status, userId, notes) {
        const crisis = await CrisisAlert_1.default.findByIdAndUpdate(crisisId, {
            status,
            $push: {
                actions: {
                    action: `Statut changé à: ${status}`,
                    performedBy: userId,
                    performedAt: new Date(),
                    notes,
                },
            },
        }, { new: true });
        return crisis;
    }
    /**
     * Assign crisis to handler
     */
    static async assignCrisis(crisisId, assigneeId, assignedBy) {
        const crisis = await CrisisAlert_1.default.findByIdAndUpdate(crisisId, {
            assignedTo: assigneeId,
            status: 'investigating',
            $push: {
                actions: {
                    action: 'Crise assignée',
                    performedBy: assignedBy,
                    performedAt: new Date(),
                },
            },
        }, { new: true });
        if (crisis) {
            await NotificationService_1.NotificationService.create({
                recipient: assigneeId,
                type: 'warning',
                title: 'Crise assignée à votre attention',
                message: `Vous êtes responsable de la crise: ${crisis.title}`,
                priority: 'urgent',
                channels: { inApp: true, email: true },
            });
        }
        return crisis;
    }
    /**
     * Send crisis communication
     */
    static async sendCrisisCommunication(crisisId, data) {
        const crisis = await CrisisAlert_1.default.findById(crisisId);
        if (!crisis)
            throw new Error('Crise non trouvée');
        // Send actual communication
        if (data.channel === 'email') {
            const recipientEmails = data.recipients.split(',').map(e => e.trim());
            for (const email of recipientEmails) {
                await (0, emailService_1.sendTemplateEmail)(email, 'crisis-alert', {
                    title: crisis.title,
                    severity: crisis.severity,
                    message: data.message,
                    date: new Date().toLocaleDateString('fr-FR'),
                });
            }
        }
        if (data.channel === 'in-app') {
            // Broadcast to all active users in affected regions
            const users = await User_1.default.find({ isActive: true });
            for (const user of users) {
                await NotificationService_1.NotificationService.create({
                    recipient: user._id.toString(),
                    type: 'warning',
                    title: `Communication de crise: ${crisis.title}`,
                    message: data.message,
                    priority: 'high',
                    channels: { inApp: true },
                });
            }
        }
        // Log communication
        await CrisisAlert_1.default.findByIdAndUpdate(crisisId, {
            $push: {
                communications: {
                    channel: data.channel,
                    sentAt: new Date(),
                    recipients: data.recipients,
                    message: data.message,
                    sentBy: data.sentBy,
                },
            },
            status: 'responding',
        });
        return crisis;
    }
    /**
     * Resolve crisis
     */
    static async resolveCrisis(crisisId, userId, summary) {
        return CrisisAlert_1.default.findByIdAndUpdate(crisisId, {
            status: 'resolved',
            resolution: {
                resolvedAt: new Date(),
                resolvedBy: userId,
                summary,
            },
        }, { new: true });
    }
    /**
     * Get active crises
     */
    static async getActiveCrises() {
        return CrisisAlert_1.default.find({ status: { $nin: ['resolved'] } })
            .populate('detectedBy', 'email firstName lastName')
            .populate('assignedTo', 'email firstName lastName')
            .sort({ severity: -1, createdAt: -1 });
    }
    /**
     * Get all crises (admin)
     */
    static async getAllCrises(filters) {
        const query = {};
        if (filters?.status)
            query.status = filters.status;
        if (filters?.type)
            query.type = filters.type;
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const crises = await CrisisAlert_1.default.find(query)
            .populate('detectedBy', 'email firstName lastName')
            .populate('assignedTo', 'email firstName lastName')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        const total = await CrisisAlert_1.default.countDocuments(query);
        return { crises, pagination: { total, page, pages: Math.ceil(total / limit) } };
    }
    /**
     * Get crisis by ID
     */
    static async getCrisisById(crisisId) {
        return CrisisAlert_1.default.findById(crisisId)
            .populate('detectedBy', 'email firstName lastName')
            .populate('assignedTo', 'email firstName lastName')
            .populate('communications.sentBy', 'email firstName lastName')
            .populate('actions.performedBy', 'email firstName lastName');
    }
}
exports.CrisisService = CrisisService;
