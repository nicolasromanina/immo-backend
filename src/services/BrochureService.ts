import BrochureRequest from '../models/BrochureRequest';
import Project from '../models/Project';
import Promoteur from '../models/Promoteur';
import ProjectBrochure from '../models/ProjectBrochure';
import Lead from '../models/Lead';
import { NotificationService } from './NotificationService';
import { WhatsAppService } from './WhatsAppService';
import { RequestLeadService } from './RequestLeadService';

export class BrochureService {
  /**
   * Request a brochure for a project
   */
  static async requestBrochure(data: {
    projectId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    clientId?: string;
    source?: 'website' | 'whatsapp' | 'direct';
  }) {
    const project = await Project.findById(data.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const existingRequest = await BrochureRequest.findOne({
      project: data.projectId,
      email: data.email,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (existingRequest) {
      throw new Error('Brochure already requested in the last 24 hours');
    }

    const request = await BrochureRequest.create({
      project: data.projectId,
      promoteur: project.promoteur,
      client: data.clientId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      source: data.source || 'website',
      status: 'pending',
    });

    await NotificationService.create({
      recipient: project.promoteur.toString(),
      type: 'lead',
      title: 'Demande de brochure',
      message: `${data.firstName} ${data.lastName} demande la brochure pour ${project.title}`,
      priority: 'medium',
      channels: { inApp: true, email: true },
      data: { requestId: request._id, projectId: data.projectId },
    });

    await this.autoSendBrochure(request._id.toString());

    // Best effort: do not fail brochure request if lead creation fails
    try {
      const { lead, conversation } = await RequestLeadService.createLeadFromRequest({
        projectId: data.projectId,
        promoteurId: project.promoteur.toString(),
        clientId: data.clientId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        requestType: 'brochure',
        initialMessage: 'Demande de brochure',
      });

      // Link lead to brochure request
      if (lead) {
        request.lead = lead._id;
        if (conversation) {
          request.conversation = conversation._id;
        }
        await request.save();
      }
    } catch (error) {
      console.error('Lead creation from brochure request failed:', error);
    }

    return request;
  }

  /**
   * Auto-send brochure if available
   */
  private static async autoSendBrochure(requestId: string) {
    const request = await BrochureRequest.findById(requestId).populate('project');
    if (!request) return;

    const project = request.project as any;

    // Check for uploaded ProjectBrochure first, then fall back to media renderings
    const projectBrochure = await ProjectBrochure.findOne({ project: project._id });
    const hasBrochure = projectBrochure || (project.media?.renderings?.length > 0);

    if (hasBrochure) {
      // Use ProjectBrochure download link if available, otherwise use media rendering link
      const downloadLink = projectBrochure
        ? `/api/project-brochures/download/${projectBrochure._id}`
        : `/api/brochures/${project._id}/download?token=${this.generateToken()}`;

      request.status = 'sent';
      request.sentAt = new Date();
      request.downloadLink = downloadLink;
      request.sentVia = 'email'; // Default to email
      await request.save();

      // Track the download in ProjectBrochure if it exists
      if (projectBrochure) {
        projectBrochure.totalDownloads = (projectBrochure.totalDownloads || 0) + 1;
        projectBrochure.lastDownloadedAt = new Date();
        await projectBrochure.save();
      }

      await NotificationService.create({
        recipient: request.email,
        type: 'system',
        title: `Brochure - ${project.title}`,
        message: `Voici le lien pour telecharger la brochure: ${downloadLink}`,
        priority: 'medium',
        channels: { email: true },
      });
    }
  }

  /**
   * Generate secure token
   */
  private static generateToken(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Track brochure download
   */
  static async trackDownload(requestId: string) {
    return BrochureRequest.findByIdAndUpdate(
      requestId,
      { downloadedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Track email open
   */
  static async trackEmailOpen(requestId: string) {
    return BrochureRequest.findByIdAndUpdate(
      requestId,
      { emailOpened: true, emailOpenedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Send brochure via WhatsApp
   */
  static async sendViaWhatsApp(requestId: string) {
    const request = await BrochureRequest.findById(requestId).populate('project');
    if (!request || !request.phone) {
      throw new Error('Request not found or no phone number');
    }

    const project = request.project as any;

    await WhatsAppService.sendTemplateMessage({
      to: request.phone,
      templateSlug: 'brochure_delivery',
      data: {
        firstName: request.firstName,
        projectName: project.title,
        downloadLink: request.downloadLink || '',
      },
    });

    request.sentVia = request.sentVia === 'email' ? 'both' : 'whatsapp';
    await request.save();

    return request;
  }

  /**
   * Get brochure requests for a project
   */
  static async getProjectRequests(projectId: string) {
    return BrochureRequest.find({ project: projectId }).sort({ createdAt: -1 });
  }

  /**
   * Get brochure requests for a promoteur
   */
  static async getPromoteurRequests(promoteurId: string, filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const query: any = { promoteur: promoteurId };

    if (filters?.status) query.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters?.startDate) query.createdAt.$gte = filters.startDate;
      if (filters?.endDate) query.createdAt.$lte = filters.endDate;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const requests = await BrochureRequest.find(query)
      .populate('project', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await BrochureRequest.countDocuments(query);

    return {
      requests,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  /**
   * Get brochure stats
   */
  static async getStats(promoteurId?: string) {
    const match: any = {};
    if (promoteurId) match.promoteur = promoteurId;

    const stats = await BrochureRequest.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          downloaded: { $sum: { $cond: [{ $ne: ['$downloadedAt', null] }, 1, 0] } },
          emailOpened: { $sum: { $cond: ['$emailOpened', 1, 0] } },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        total: 0,
        sent: 0,
        downloaded: 0,
        emailOpened: 0,
        downloadRate: 0,
        openRate: 0,
      };
    }

    const { total, sent, downloaded, emailOpened } = stats[0];

    return {
      total,
      sent,
      downloaded,
      emailOpened,
      downloadRate: sent > 0 ? Math.round((downloaded / sent) * 100) : 0,
      openRate: sent > 0 ? Math.round((emailOpened / sent) * 100) : 0,
    };
  }
}
