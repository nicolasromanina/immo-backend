import Partner from '../models/Partner';
import ServiceRequest from '../models/ServiceRequest';
import { NotificationService } from './NotificationService';
import mongoose from 'mongoose';

export class PartnerService {
  /**
   * Get all partners with filters
   */
  static async getPartners(filters: {
    type?: string;
    status?: string;
    country?: string;
    city?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.country) query.countries = filters.country;
    if (filters.city) query.cities = filters.city;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const partners = await Partner.find(query)
      .sort({ isFeatured: -1, averageRating: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Partner.countDocuments(query);

    return {
      partners,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  /**
   * Get partner by ID
   */
  static async getPartnerById(partnerId: string) {
    return Partner.findById(partnerId);
  }

  /**
   * Create a new partner
   */
  static async createPartner(data: {
    name: string;
    type: string;
    description: string;
    email: string;
    phone: string;
    website?: string;
    address?: string;
    countries: string[];
    cities: string[];
    logo?: string;
  }) {
    const partner = new Partner({
      ...data,
      status: 'pending',
    });

    await partner.save();

    // Notify admins
    await NotificationService.create({
      recipient: 'admin',
      type: 'system',
      title: 'Nouveau partenaire',
      message: `Un nouveau partenaire "${data.name}" a été créé`,
      priority: 'medium',
      channels: { inApp: true },
      data: { partnerId: partner._id },
    });

    return partner;
  }

  /**
   * Update partner
   */
  static async updatePartner(partnerId: string, data: Partial<{
    name: string;
    description: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    countries: string[];
    cities: string[];
    logo: string;
    status: string;
  }>) {
    return Partner.findByIdAndUpdate(partnerId, data, { new: true });
  }

  /**
   * Verify partner (admin)
   */
  static async verifyPartner(partnerId: string, adminId: string) {
    const partner = await Partner.findByIdAndUpdate(
      partnerId,
      {
        status: 'active',
        verifiedAt: new Date(),
        verifiedBy: adminId,
      },
      { new: true }
    );

    if (partner) {
      // Send verification notification
      await NotificationService.create({
        recipient: 'admin',
        type: 'system',
        title: 'Partenaire vérifié',
        message: `Le partenaire "${partner.name}" a été vérifié`,
        priority: 'low',
        channels: { inApp: true },
      });
    }

    return partner;
  }

  /**
   * Create a service request
   */
  static async createServiceRequest(data: {
    clientId: string;
    projectId?: string;
    type: string;
    description: string;
    preferredPartnerId?: string;
  }) {
    const request = new ServiceRequest({
      client: data.clientId,
      project: data.projectId,
      partner: data.preferredPartnerId,
      type: data.type,
      description: data.description,
      status: data.preferredPartnerId ? 'assigned' : 'pending',
      assignedAt: data.preferredPartnerId ? new Date() : undefined,
    });

    await request.save();

    // If no specific partner, find matching ones
    if (!data.preferredPartnerId) {
      const matchingPartners = await Partner.find({
        type: data.type,
        status: 'active',
      }).limit(5);

      // Notify matching partners
      for (const partner of matchingPartners) {
        await NotificationService.create({
          recipient: 'admin', // In real impl, would notify partner
          type: 'lead',
          title: 'Nouvelle demande de service',
          message: `Une nouvelle demande de ${data.type} est disponible`,
          priority: 'medium',
          channels: { inApp: true, email: true },
          data: { requestId: request._id },
        });
      }
    } else {
      // Notify assigned partner
      await NotificationService.create({
        recipient: 'admin',
        type: 'lead',
        title: 'Demande de service assignée',
        message: `Une demande de ${data.type} vous a été assignée`,
        priority: 'high',
        channels: { inApp: true, email: true },
        data: { requestId: request._id },
      });
    }

    return request;
  }

  /**
   * Assign service request to partner
   */
  static async assignRequest(requestId: string, partnerId: string) {
    const request = await ServiceRequest.findByIdAndUpdate(
      requestId,
      {
        partner: partnerId,
        status: 'assigned',
        assignedAt: new Date(),
      },
      { new: true }
    );

    if (request) {
      // Update partner stats
      await Partner.findByIdAndUpdate(partnerId, {
        $inc: { totalRequests: 1 },
      });

      // Notify client
      await NotificationService.create({
        recipient: request.client.toString(),
        type: 'system',
        title: 'Demande assignée',
        message: 'Un partenaire a été assigné à votre demande',
        priority: 'medium',
        channels: { inApp: true, email: true },
      });
    }

    return request;
  }

  /**
   * Complete service request
   */
  static async completeRequest(requestId: string, partnerId: string) {
    const request = await ServiceRequest.findByIdAndUpdate(
      requestId,
      {
        status: 'completed',
        completedAt: new Date(),
      },
      { new: true }
    );

    if (request) {
      // Update partner stats
      await Partner.findByIdAndUpdate(partnerId, {
        $inc: { completedRequests: 1 },
      });

      // Notify client
      await NotificationService.create({
        recipient: request.client.toString(),
        type: 'system',
        title: 'Service complété',
        message: 'Votre demande de service a été complétée',
        priority: 'medium',
        channels: { inApp: true, email: true },
      });
    }

    return request;
  }

  /**
   * Rate service request
   */
  static async rateRequest(requestId: string, rating: number, review?: string) {
    const request = await ServiceRequest.findByIdAndUpdate(
      requestId,
      { rating, review },
      { new: true }
    );

    if (request && request.partner) {
      // Update partner average rating
      const allRatings = await ServiceRequest.find({
        partner: request.partner,
        rating: { $exists: true },
      });

      const avgRating = allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / allRatings.length;

      await Partner.findByIdAndUpdate(request.partner, {
        averageRating: Math.round(avgRating * 10) / 10,
      });
    }

    return request;
  }

  /**
   * Get service requests for a client
   */
  static async getClientRequests(clientId: string) {
    return ServiceRequest.find({ client: clientId })
      .populate('partner', 'name type logo')
      .populate('project', 'title')
      .sort({ createdAt: -1 });
  }

  /**
   * Get service requests for a partner
   */
  static async getPartnerRequests(partnerId: string) {
    return ServiceRequest.find({ partner: partnerId })
      .populate('client', 'firstName lastName email')
      .populate('project', 'title')
      .sort({ createdAt: -1 });
  }

  /**
   * Get featured partners
   */
  static async getFeaturedPartners(type?: string) {
    const query: any = { status: 'active', isFeatured: true };
    if (type) query.type = type;

    return Partner.find(query)
      .sort({ averageRating: -1 })
      .limit(10);
  }
}
