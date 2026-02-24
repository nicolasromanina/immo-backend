"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportService = void 0;
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const User_1 = __importDefault(require("../models/User"));
const NotificationService_1 = require("./NotificationService");
const emailService_1 = require("../utils/emailService");
class SupportService {
    /**
     * Create a support ticket
     */
    static async createTicket(data) {
        const ticket = new SupportTicket_1.default({
            user: data.userId,
            category: data.category,
            subject: data.subject,
            description: data.description,
            priority: data.priority || 'medium',
            messages: [{
                    sender: data.userId,
                    senderRole: 'user',
                    content: data.description,
                    attachments: data.attachments,
                    sentAt: new Date(),
                    isInternal: false,
                }],
        });
        await ticket.save();
        // Notify user
        const user = await User_1.default.findById(data.userId);
        if (user?.email) {
            await (0, emailService_1.sendTemplateEmail)(user.email, 'support-ticket-created', {
                ticketNumber: ticket.ticketNumber,
                subject: data.subject,
                name: user.firstName,
            });
        }
        // Notify support team
        await NotificationService_1.NotificationService.createAdminNotification({
            type: 'system',
            title: `Nouveau ticket #${ticket.ticketNumber}`,
            message: `${data.subject} — Priorité: ${data.priority || 'medium'}`,
            priority: data.priority === 'urgent' ? 'urgent' : 'medium',
            link: `/admin/support/${ticket._id}`,
        });
        return ticket;
    }
    /**
     * Reply to a ticket
     */
    static async replyToTicket(ticketId, data) {
        const ticket = await SupportTicket_1.default.findById(ticketId);
        if (!ticket)
            throw new Error('Ticket not found');
        ticket.messages.push({
            sender: data.senderId,
            senderRole: data.senderRole,
            content: data.content,
            attachments: data.attachments,
            sentAt: new Date(),
            isInternal: data.isInternal || false,
        });
        // Update status based on who replied
        if (data.senderRole === 'admin' || data.senderRole === 'support') {
            if (!ticket.firstResponseAt) {
                ticket.firstResponseAt = new Date();
            }
            ticket.status = 'waiting-user';
        }
        else {
            ticket.status = 'waiting-admin';
        }
        await ticket.save();
        // Notify the other party (skip for internal notes)
        if (!data.isInternal) {
            if (data.senderRole === 'user') {
                await NotificationService_1.NotificationService.createAdminNotification({
                    type: 'system',
                    title: `Réponse ticket #${ticket.ticketNumber}`,
                    message: 'L\'utilisateur a répondu au ticket',
                    priority: 'medium',
                    link: `/admin/support/${ticket._id}`,
                });
            }
            else {
                const user = await User_1.default.findById(ticket.user);
                if (user?.email) {
                    await (0, emailService_1.sendTemplateEmail)(user.email, 'support-ticket-reply', {
                        ticketNumber: ticket.ticketNumber,
                        name: user.firstName,
                    });
                }
                await NotificationService_1.NotificationService.create({
                    recipient: ticket.user.toString(),
                    type: 'system',
                    title: `Réponse ticket #${ticket.ticketNumber}`,
                    message: 'L\'équipe support a répondu à votre ticket',
                    priority: 'medium',
                    channels: { inApp: true, email: true },
                });
            }
        }
        return ticket;
    }
    /**
     * Assign ticket to agent
     */
    static async assignTicket(ticketId, agentId) {
        return SupportTicket_1.default.findByIdAndUpdate(ticketId, {
            assignedTo: agentId,
            status: 'in-progress',
        }, { new: true });
    }
    /**
     * Resolve ticket
     */
    static async resolveTicket(ticketId, adminId, resolutionNote) {
        const ticket = await SupportTicket_1.default.findById(ticketId);
        if (!ticket)
            throw new Error('Ticket not found');
        ticket.status = 'resolved';
        ticket.resolvedAt = new Date();
        if (resolutionNote) {
            ticket.messages.push({
                sender: adminId,
                senderRole: 'system',
                content: `Ticket résolu : ${resolutionNote}`,
                sentAt: new Date(),
                isInternal: false,
            });
        }
        await ticket.save();
        if (ticket.user) {
            await NotificationService_1.NotificationService.create({
                recipient: ticket.user.toString(),
                type: 'system',
                title: `Ticket #${ticket.ticketNumber} résolu`,
                message: resolutionNote || 'Votre ticket a été résolu',
                priority: 'medium',
                channels: { inApp: true, email: true },
            });
        }
        return ticket;
    }
    /**
     * Close ticket
     */
    static async closeTicket(ticketId) {
        return SupportTicket_1.default.findByIdAndUpdate(ticketId, {
            status: 'closed',
            closedAt: new Date(),
        }, { new: true });
    }
    /**
     * Rate ticket satisfaction
     */
    static async rateTicket(ticketId, userId, rating, comment) {
        const ticket = await SupportTicket_1.default.findOne({ _id: ticketId, user: userId });
        if (!ticket)
            throw new Error('Ticket not found');
        ticket.satisfaction = {
            rating,
            comment,
            submittedAt: new Date(),
        };
        await ticket.save();
        return ticket;
    }
    /**
     * Get user's tickets
     */
    static async getUserTickets(userId, filters) {
        const query = { user: userId };
        if (filters?.status)
            query.status = filters.status;
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const tickets = await SupportTicket_1.default.find(query)
            .select('-messages')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        const total = await SupportTicket_1.default.countDocuments(query);
        return { tickets, pagination: { total, page, pages: Math.ceil(total / limit) } };
    }
    /**
     * Get all tickets (admin)
     */
    static async getAllTickets(filters) {
        const query = {};
        if (filters?.status)
            query.status = filters.status;
        if (filters?.category)
            query.category = filters.category;
        if (filters?.priority)
            query.priority = filters.priority;
        if (filters?.assignedTo)
            query.assignedTo = filters.assignedTo;
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const tickets = await SupportTicket_1.default.find(query)
            .populate('user', 'email firstName lastName')
            .populate('assignedTo', 'email firstName lastName')
            .sort({ priority: -1, updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        const total = await SupportTicket_1.default.countDocuments(query);
        // Stats
        const stats = await SupportTicket_1.default.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        return {
            tickets,
            pagination: { total, page, pages: Math.ceil(total / limit) },
            stats: stats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
        };
    }
    /**
     * Get ticket by ID with messages
     */
    static async getTicketById(ticketId, userId) {
        const query = { _id: ticketId };
        if (userId)
            query.user = userId;
        const ticket = await SupportTicket_1.default.findOne(query)
            .populate('user', 'email firstName lastName')
            .populate('assignedTo', 'email firstName lastName')
            .populate('messages.sender', 'email firstName lastName');
        if (!ticket)
            throw new Error('Ticket not found');
        // Filter internal notes for non-admin users
        if (userId) {
            ticket.messages = ticket.messages.filter(m => !m.isInternal);
        }
        return ticket;
    }
}
exports.SupportService = SupportService;
