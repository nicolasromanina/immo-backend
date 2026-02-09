import CrisisAlert, { ICrisisAlert } from '../models/CrisisAlert';
import { NotificationService } from './NotificationService';
import { sendEmail, sendTemplateEmail } from '../utils/emailService';
import User from '../models/User';

export class CrisisService {
  /**
   * Declare a crisis
   */
  static async declareCrisis(data: {
    type: ICrisisAlert['type'];
    severity: ICrisisAlert['severity'];
    title: string;
    description: string;
    source: string;
    detectedBy: string;
    affectedEntities?: ICrisisAlert['affectedEntities'];
  }) {
    const crisis = await CrisisAlert.create({
      ...data,
      status: 'detected',
    });

    // Notify all admins immediately
    const admins = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true });
    for (const admin of admins) {
      await NotificationService.create({
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
  static async updateStatus(crisisId: string, status: ICrisisAlert['status'], userId: string, notes?: string) {
    const crisis = await CrisisAlert.findByIdAndUpdate(crisisId, {
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
  static async assignCrisis(crisisId: string, assigneeId: string, assignedBy: string) {
    const crisis = await CrisisAlert.findByIdAndUpdate(crisisId, {
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
      await NotificationService.create({
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
  static async sendCrisisCommunication(crisisId: string, data: {
    channel: 'email' | 'whatsapp' | 'sms' | 'in-app';
    recipients: string;
    message: string;
    sentBy: string;
  }) {
    const crisis = await CrisisAlert.findById(crisisId);
    if (!crisis) throw new Error('Crise non trouvée');

    // Send actual communication
    if (data.channel === 'email') {
      const recipientEmails = data.recipients.split(',').map(e => e.trim());
      for (const email of recipientEmails) {
        await sendTemplateEmail(email, 'crisis-alert', {
          title: crisis.title,
          severity: crisis.severity,
          message: data.message,
          date: new Date().toLocaleDateString('fr-FR'),
        });
      }
    }

    if (data.channel === 'in-app') {
      // Broadcast to all active users in affected regions
      const users = await User.find({ isActive: true });
      for (const user of users) {
        await NotificationService.create({
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
    await CrisisAlert.findByIdAndUpdate(crisisId, {
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
  static async resolveCrisis(crisisId: string, userId: string, summary: string) {
    return CrisisAlert.findByIdAndUpdate(crisisId, {
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
    return CrisisAlert.find({ status: { $nin: ['resolved'] } })
      .populate('detectedBy', 'email firstName lastName')
      .populate('assignedTo', 'email firstName lastName')
      .sort({ severity: -1, createdAt: -1 });
  }

  /**
   * Get all crises (admin)
   */
  static async getAllCrises(filters?: { status?: string; type?: string; page?: number; limit?: number }) {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.type) query.type = filters.type;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const crises = await CrisisAlert.find(query)
      .populate('detectedBy', 'email firstName lastName')
      .populate('assignedTo', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await CrisisAlert.countDocuments(query);
    return { crises, pagination: { total, page, pages: Math.ceil(total / limit) } };
  }

  /**
   * Get crisis by ID
   */
  static async getCrisisById(crisisId: string) {
    return CrisisAlert.findById(crisisId)
      .populate('detectedBy', 'email firstName lastName')
      .populate('assignedTo', 'email firstName lastName')
      .populate('communications.sentBy', 'email firstName lastName')
      .populate('actions.performedBy', 'email firstName lastName');
  }
}
