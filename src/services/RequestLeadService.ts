import Lead from '../models/Lead';
import Project from '../models/Project';
import Promoteur from '../models/Promoteur';
import { RealChatService } from './RealChatService';
import mongoose from 'mongoose';

export interface RequestLeadData {
  projectId: string;
  promoteurId: string;
  clientId?: string; // User ID if authenticated
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  requestType: 'brochure' | 'appointment' | 'document-access' | 'contact-form' | 'other';
  initialMessage?: string;
}

export class RequestLeadService {
  /**
   * Create or update a lead from any request type and optionally create a conversation
   * Unified service for brochures, appointments, document access, contact forms, etc.
   */
  static async createLeadFromRequest(data: RequestLeadData) {
    // Map request types to lead sources
    const sourceMap: Record<string, string> = {
      'brochure': 'brochure-request',
      'appointment': 'appointment-request',
      'document-access': 'document-access-request',
      'contact-form': 'contact-form',
      'other': 'other',
    };

    const source = sourceMap[data.requestType] || 'other';

    // Check if lead already exists
    let lead = await Lead.findOne({
      project: data.projectId,
      email: data.email,
    });

    if (lead) {
      // Lead already exists, just return it
      console.log('[RequestLeadService] Lead already exists:', lead._id);
      return { lead, isNew: false, conversation: null };
    }

    // Create new lead with tags initialized
    lead = new Lead({
      project: data.projectId,
      promoteur: data.promoteurId,
      client: data.clientId || undefined,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || '',
      status: 'nouveau',
      source,
      score: data.requestType === 'document-access' ? 'B' : 'C',
      scoreDetails: {
        budgetMatch: data.requestType === 'document-access' ? 50 : 50,
        timelineMatch: data.requestType === 'document-access' ? 50 : 50,
        engagementLevel: data.requestType === 'document-access' ? 60 : 30,
        profileCompleteness: data.requestType === 'document-access' ? 40 : 50,
      },
      tags: ['not-contacted'], // Initialize tags explicitly
      initialMessage: data.initialMessage || `Demande de ${data.requestType}`,
      contactMethod: data.phone ? 'phone' : 'email',
      isSerious: true,
      responseSLA: true,
      pipeline: data.clientId ? [{
        status: 'nouveau',
        changedAt: new Date(),
        changedBy: new mongoose.Types.ObjectId(data.clientId),
        notes: `Lead créé via ${data.requestType}`,
      }] : [],
      notes: [],
      documentsSent: [],
      flaggedAsNotSerious: false,
      converted: false,
    });

    await lead.save();
    console.log(`[RequestLeadService] New lead created from ${data.requestType}:`, lead._id);

    // Create conversation if client is authenticated
    let conversation = null;
    if (data.clientId) {
      try {
        conversation = await this.createConversation(
          data.promoteurId,
          data.clientId,
          data.requestType,
          data.initialMessage
        );
      } catch (convErr: any) {
        console.warn('[RequestLeadService] Error creating conversation:', convErr.message);
        // Don't fail the entire operation if conversation creation fails
      }
    }

    // Update project stats
    await Project.findByIdAndUpdate(data.projectId, {
      $inc: { totalLeads: 1 },
    });

    // Update promoteur stats
    await Promoteur.findByIdAndUpdate(data.promoteurId, {
      $inc: { totalLeadsReceived: 1 },
    });

    return { lead, isNew: true, conversation };
  }

  /**
   * Create conversation between client and promoteur
   */
  private static async createConversation(
    promoteurId: string,
    clientId: string,
    requestType: string,
    message?: string
  ) {
    try {
      const promoteurDoc = await Promoteur.findById(promoteurId).populate('user');
      const promoteurUserId = (promoteurDoc?.user as any)?._id?.toString();

      const participants = [
        { user: clientId, role: 'client' },
        { user: promoteurUserId || promoteurId, role: 'promoteur' },
      ];

      const conversation = await RealChatService.createConversation(participants);

      // Add initial message
      const messageText = message || `Demande de ${requestType}`;
      await RealChatService.addMessage(
        conversation._id.toString(),
        clientId,
        messageText,
        'text'
      );

      console.log('[RequestLeadService] Conversation created:', {
        conversationId: conversation._id?.toString(),
        promoteurId,
        clientId,
        requestType,
      });

      return conversation;
    } catch (err: any) {
      console.error('[RequestLeadService] Error creating conversation:', err.message);
      throw err;
    }
  }

  /**
   * Get lead by project and email (for checking if lead already exists)
   */
  static async getLeadByProjectAndEmail(projectId: string, email: string) {
    return Lead.findOne({
      project: projectId,
      email,
    });
  }

  /**
   * Update lead with request metadata
   */
  static async updateLeadWithRequest(
    leadId: string,
    requestType: string,
    metadata?: Record<string, any>
  ) {
    return Lead.findByIdAndUpdate(
      leadId,
      {
        $push: {
          notes: {
            content: `Demande ${requestType} reçue`,
            addedAt: new Date(),
            isPrivate: false,
            ...metadata,
          },
        },
      },
      { new: true }
    );
  }
}
