import { emitToUser, emitToRole, emitToProject } from '../config/websocket';
import Notification from '../models/Notification';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Real-time notification service using WebSocket + DB persistence
 */
export class RealTimeNotificationService {
  /**
   * Send notification to a specific user (persisted + real-time)
   */
  static async notify(payload: NotificationPayload) {
    try {
      // Persist to DB
      const notification = await Notification.create({
        recipient: payload.userId,
        type: payload.type.split(':')[0] || 'system', // Map to model enum
        title: payload.title,
        message: payload.message,
        data: { ...payload.data, subType: payload.type },
        actionUrl: payload.link,
        priority: payload.priority || 'medium',
        read: false,
        channels: { inApp: true, email: false, whatsapp: false },
      });

      // Emit via WebSocket
      emitToUser(payload.userId, 'notification:new', {
        id: notification._id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        link: payload.link,
        priority: payload.priority || 'medium',
        createdAt: notification.createdAt,
      });

      return notification;
    } catch (error) {
      console.error('[Notification] Error sending notification:', error);
      return null;
    }
  }

  /**
   * Notify about new lead (to promoteur)
   */
  static async notifyNewLead(promoteurUserId: string, lead: any) {
    return this.notify({
      userId: promoteurUserId,
      type: 'lead:new',
      title: 'Nouveau lead reçu',
      message: `${lead.firstName} ${lead.lastName} est intéressé par votre projet`,
      data: { leadId: lead._id, projectId: lead.project, score: lead.score },
      link: `/leads`,
      priority: lead.score === 'A' ? 'urgent' : lead.score === 'B' ? 'high' : 'medium',
    });
  }

  /**
   * Notify about lead status change (to client)
   */
  static async notifyLeadStatusChange(clientUserId: string, lead: any, newStatus: string) {
    const statusLabels: Record<string, string> = {
      'contacte': 'Le promoteur vous a contacté',
      'rdv-planifie': 'Un rendez-vous a été planifié',
      'visite-effectuee': 'La visite a été effectuée',
      'proposition-envoyee': 'Une proposition vous a été envoyée',
      'gagne': 'Félicitations ! Votre demande a été acceptée',
    };

    return this.notify({
      userId: clientUserId,
      type: 'lead:status-changed',
      title: 'Mise à jour de votre demande',
      message: statusLabels[newStatus] || `Statut mis à jour: ${newStatus}`,
      data: { leadId: lead._id, status: newStatus },
      link: `/projets`,
      priority: newStatus === 'gagne' ? 'high' : 'medium',
    });
  }

  /**
   * Notify about project update (to all interested clients)
   */
  static async notifyProjectUpdate(projectId: string, update: any, interestedUserIds: string[]) {
    // Emit to project room for real-time listeners
    emitToProject(projectId, 'project:updated', {
      projectId,
      updateType: update.type,
      title: update.title,
    });

    // Individual notifications
    for (const userId of interestedUserIds) {
      await this.notify({
        userId,
        type: 'project:update',
        title: 'Mise à jour du projet',
        message: update.title || 'Le projet a été mis à jour',
        data: { projectId, updateId: update._id },
        link: `/projets/${projectId}`,
        priority: 'medium',
      });
    }
  }

  /**
   * Notify about trust score change
   */
  static async notifyTrustScoreChange(promoteurUserId: string, oldScore: number, newScore: number) {
    const direction = newScore > oldScore ? 'augmenté' : 'diminué';
    const priority = newScore < oldScore ? 'high' : 'low';

    return this.notify({
      userId: promoteurUserId,
      type: 'trust:score-changed',
      title: `Score de confiance ${direction}`,
      message: `Votre score est passé de ${oldScore} à ${newScore}`,
      data: { oldScore, newScore },
      link: '/profile',
      priority,
    });
  }

  /**
   * Notify about appointment reminder
   */
  static async notifyAppointmentReminder(userId: string, appointment: any) {
    return this.notify({
      userId,
      type: 'appointment:reminder',
      title: 'Rappel de rendez-vous',
      message: `Rendez-vous prévu le ${new Date(appointment.scheduledAt).toLocaleDateString('fr-FR')}`,
      data: { appointmentId: appointment._id },
      link: '/calendar',
      priority: 'high',
    });
  }

  /**
   * Notify admins about pending moderation
   */
  static async notifyAdminModeration(type: string, entityId: string, details: string) {
    emitToRole('admin', 'admin:moderation', {
      type,
      entityId,
      details,
      createdAt: new Date(),
    });
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ recipient: userId, read: false });
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(userId: string, notificationIds: string[]) {
    await Notification.updateMany(
      { _id: { $in: notificationIds }, recipient: userId },
      { read: true, readAt: new Date() }
    );
    
    const count = await this.getUnreadCount(userId);
    emitToUser(userId, 'notification:count', { unread: count });
  }

  /**
   * Mark all as read
   */
  static async markAllAsRead(userId: string) {
    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    emitToUser(userId, 'notification:count', { unread: 0 });
  }
}
