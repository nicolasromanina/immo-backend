import ManagedService from '../models/ManagedService';
import Promoteur from '../models/Promoteur';
import { NotificationService } from './NotificationService';
import { PlanLimitService } from './PlanLimitService';

export class ManagedServiceManager {
  /**
   * Request managed service
   */
  static async requestManagedService(data: {
    promoteurId: string;
    type: 'full' | 'partial' | 'updates-only' | 'leads-only';
    scope: {
      updateManagement?: boolean;
      leadManagement?: boolean;
      documentManagement?: boolean;
      communicationManagement?: boolean;
    };
    monthlyFee: number;
  }) {
    const canUseManagedService = await PlanLimitService.checkCapability(data.promoteurId, 'managedService');
    if (!canUseManagedService) {
      throw new Error('Managed service is not available on this plan');
    }

    const managed = await ManagedService.create({
      promoteur: data.promoteurId,
      type: data.type,
      scope: {
        updateManagement: data.scope.updateManagement ?? (data.type === 'full' || data.type === 'updates-only'),
        leadManagement: data.scope.leadManagement ?? (data.type === 'full' || data.type === 'leads-only'),
        documentManagement: data.scope.documentManagement ?? (data.type === 'full'),
        communicationManagement: data.scope.communicationManagement ?? (data.type === 'full'),
      },
      monthlyFee: data.monthlyFee,
      startDate: new Date(),
    });

    await NotificationService.createAdminNotification({
      type: 'system',
      title: 'Nouvelle demande Managed',
      message: `Un promoteur demande le service géré (${data.type})`,
      priority: 'high',
      link: `/admin/managed/${managed._id}`,
    });

    return managed;
  }

  /**
   * Activate managed service
   */
  static async activate(serviceId: string, managerId: string) {
    const service = await ManagedService.findByIdAndUpdate(serviceId, {
      status: 'active',
      assignedManager: managerId,
    }, { new: true });

    if (service) {
      const promoteur = await Promoteur.findById(service.promoteur).populate('user');
      if (promoteur?.user) {
        await NotificationService.create({
          recipient: (promoteur.user as any)._id.toString(),
          type: 'system',
          title: 'Service géré activé',
          message: 'Votre service de gestion déléguée est maintenant actif.',
          priority: 'high',
          channels: { inApp: true, email: true },
        });
      }
    }

    return service;
  }

  /**
   * Log activity
   */
  static async logActivity(serviceId: string, action: string, performedBy: string, details: string) {
    return ManagedService.findByIdAndUpdate(serviceId, {
      $push: {
        activityLog: { action, performedBy, performedAt: new Date(), details },
      },
    }, { new: true });
  }

  /**
   * Get managed services for promoteur
   */
  static async getForPromoteur(promoteurId: string) {
    return ManagedService.find({ promoteur: promoteurId })
      .populate('assignedManager', 'email firstName lastName')
      .sort({ createdAt: -1 });
  }

  /**
   * Get all managed services (admin)
   */
  static async getAll(filters?: { status?: string; page?: number; limit?: number }) {
    const query: any = {};
    if (filters?.status) query.status = filters.status;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const services = await ManagedService.find(query)
      .populate('promoteur', 'organizationName')
      .populate('assignedManager', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await ManagedService.countDocuments(query);
    return { services, pagination: { total, page, pages: Math.ceil(total / limit) } };
  }

  /**
   * Terminate managed service
   */
  static async terminate(serviceId: string, reason: string) {
    return ManagedService.findByIdAndUpdate(serviceId, {
      status: 'terminated',
      endDate: new Date(),
      notes: reason,
    }, { new: true });
  }
}
