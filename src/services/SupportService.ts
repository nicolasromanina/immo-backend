import SupportTicket from '../models/SupportTicket';
import User from '../models/User';
import { NotificationService } from './NotificationService';
import { sendTemplateEmail } from '../utils/emailService';

export class SupportService {
  /**
   * Create a support ticket
   */
  static async createTicket(data: {
    userId: string;
    category: string;
    subject: string;
    description: string;
    priority?: string;
    attachments?: string[];
  }) {
    const ticket = new SupportTicket({
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
    const user = await User.findById(data.userId);
    if (user?.email) {
      await sendTemplateEmail(user.email, 'support-ticket-created', {
        ticketNumber: ticket.ticketNumber,
        subject: data.subject,
        name: user.firstName,
      });
    }

    // Notify support team
    await NotificationService.createAdminNotification({
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
  static async replyToTicket(ticketId: string, data: {
    senderId: string;
    senderRole: 'user' | 'admin' | 'support';
    content: string;
    attachments?: string[];
    isInternal?: boolean;
  }) {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.messages.push({
      sender: data.senderId as any,
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
    } else {
      ticket.status = 'waiting-admin';
    }

    await ticket.save();

    // Notify the other party (skip for internal notes)
    if (!data.isInternal) {
      if (data.senderRole === 'user') {
        await NotificationService.createAdminNotification({
          type: 'system',
          title: `Réponse ticket #${ticket.ticketNumber}`,
          message: 'L\'utilisateur a répondu au ticket',
          priority: 'medium',
          link: `/admin/support/${ticket._id}`,
        });
      } else {
        const user = await User.findById(ticket.user);
        if (user?.email) {
          await sendTemplateEmail(user.email, 'support-ticket-reply', {
            ticketNumber: ticket.ticketNumber,
            name: user.firstName,
          });
        }
        await NotificationService.create({
          recipient: ticket.user!.toString(),
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
  static async assignTicket(ticketId: string, agentId: string) {
    return SupportTicket.findByIdAndUpdate(ticketId, {
      assignedTo: agentId,
      status: 'in-progress',
    }, { new: true });
  }

  /**
   * Resolve ticket
   */
  static async resolveTicket(ticketId: string, adminId: string, resolutionNote?: string) {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.status = 'resolved';
    ticket.resolvedAt = new Date();

    if (resolutionNote) {
      ticket.messages.push({
        sender: adminId as any,
        senderRole: 'system',
        content: `Ticket résolu : ${resolutionNote}`,
        sentAt: new Date(),
        isInternal: false,
      });
    }

    await ticket.save();

    if (ticket.user) {
      await NotificationService.create({
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
  static async closeTicket(ticketId: string) {
    return SupportTicket.findByIdAndUpdate(ticketId, {
      status: 'closed',
      closedAt: new Date(),
    }, { new: true });
  }

  /**
   * Rate ticket satisfaction
   */
  static async rateTicket(ticketId: string, userId: string, rating: number, comment?: string) {
    const ticket = await SupportTicket.findOne({ _id: ticketId, user: userId });
    if (!ticket) throw new Error('Ticket not found');

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
  static async getUserTickets(userId: string, filters?: { status?: string; page?: number; limit?: number }) {
    const query: any = { user: userId };
    if (filters?.status) query.status = filters.status;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const tickets = await SupportTicket.find(query)
      .select('-messages')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await SupportTicket.countDocuments(query);

    return { tickets, pagination: { total, page, pages: Math.ceil(total / limit) } };
  }

  /**
   * Get all tickets (admin)
   */
  static async getAllTickets(filters?: {
    status?: string;
    category?: string;
    priority?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.category) query.category = filters.category;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.assignedTo) query.assignedTo = filters.assignedTo;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const tickets = await SupportTicket.find(query)
      .populate('user', 'email firstName lastName')
      .populate('assignedTo', 'email firstName lastName')
      .sort({ priority: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await SupportTicket.countDocuments(query);

    // Stats
    const stats = await SupportTicket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return {
      tickets,
      pagination: { total, page, pages: Math.ceil(total / limit) },
      stats: stats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {} as Record<string, number>),
    };
  }

  /**
   * Get ticket by ID with messages
   */
  static async getTicketById(ticketId: string, userId?: string) {
    const query: any = { _id: ticketId };
    if (userId) query.user = userId;

    const ticket = await SupportTicket.findOne(query)
      .populate('user', 'email firstName lastName')
      .populate('assignedTo', 'email firstName lastName')
      .populate('messages.sender', 'email firstName lastName');

    if (!ticket) throw new Error('Ticket not found');

    // Filter internal notes for non-admin users
    if (userId) {
      ticket.messages = ticket.messages.filter(m => !m.isInternal);
    }

    return ticket;
  }
}
