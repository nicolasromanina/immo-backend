import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import DocumentAccessRequest from '../models/DocumentAccessRequest';
import Document from '../models/Document';
import Project from '../models/Project';
import User from '../models/User';
import Promoteur from '../models/Promoteur';
import Lead from '../models/Lead';
import RealtimeConversation from '../models/Conversation';
import { RealChatService } from '../services/RealChatService';
import { RequestLeadService } from '../services/RequestLeadService';

export class DocumentAccessRequestController {
  /**
   * Request access to a private document
   * Called by client when viewing a project
   */
  static async requestDocumentAccess(req: AuthRequest, res: Response) {
    try {
      const { documentId, projectId } = req.body;
      const clientId = req.user?.id;

      if (!clientId || !documentId || !projectId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if document belongs to project
      if (document.project.toString() !== projectId) {
        return res.status(403).json({ error: 'Document does not belong to this project' });
      }

      // Check if already has access
      if (document.visibility === 'public') {
        return res.status(400).json({ error: 'Document is already public' });
      }

      if (
        document.visibility === 'shared' &&
        document.sharedWith.some((id) => id.toString() === clientId)
      ) {
        return res.status(400).json({ error: 'Already has access to document' });
      }

      // Check if request already exists
      const existingRequest = await DocumentAccessRequest.findOne({
        document: documentId,
        client: clientId,
        status: 'pending',
      });

      if (existingRequest) {
        return res.status(400).json({ error: 'Request already pending' });
      }

      // Get client information
      const client = await User.findById(clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Create access request
      const accessRequest = new DocumentAccessRequest({
        document: documentId,
        project: projectId,
        promoteur: project.promoteur,
        client: clientId,
        status: 'pending',
        requestedAt: new Date(),
      });

      // Create or update a Lead for this client (and conversation) via unified service
      let conversation: any = null;
      try {
        const result = await RequestLeadService.createLeadFromRequest({
          projectId,
          promoteurId: project.promoteur.toString(),
          clientId,
          firstName: client.firstName || '',
          lastName: client.lastName || '',
          email: client.email,
          phone: client.phone || '',
          requestType: 'document-access',
          initialMessage: `Demande d'accès aux documents du projet`,
        });

        conversation = result.conversation;

        if (conversation) {
          accessRequest.conversation = conversation._id;
        }

        console.log('[requestDocumentAccess] Lead and conversation created:', {
          leadId: result.lead._id,
          conversationId: conversation?._id,
        });
      } catch (err: any) {
        console.warn('[requestDocumentAccess] Error creating lead/conversation:', err.message);
        // Don't fail the request if lead creation fails
      }

      // Save access request (now possibly with conversation linked)
      await accessRequest.save();

      res.status(201).json({
        success: true,
        accessRequest: accessRequest.toObject(),
        conversation: conversation ? conversation.toObject() : null,
      });
    } catch (error: any) {
      console.error('[DocumentAccessRequest] Error requesting access:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  /**
   * Get pending access requests for a promoteur
   */
  static async getPendingRequests(req: AuthRequest, res: Response) {
    try {
      const promoteurId = req.user?.promoteurProfile || req.user?.id;
      if (!promoteurId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const requests = await DocumentAccessRequest.find({
        promoteur: promoteurId,
        status: 'pending',
      })
        .populate('document', 'name category visibility')
        .populate('project', 'name')
        .populate('client', 'email firstName lastName')
        .sort({ requestedAt: -1 });

      res.json({
        success: true,
        requests,
      });
    } catch (error: any) {
      console.error('[DocumentAccessRequest] Error getting pending requests:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  /**
   * Get all requests (with filters) for a promoteur
   */
  static async getAllRequests(req: AuthRequest, res: Response) {
    try {
      const promoteurId = req.user?.promoteurProfile || req.user?.id;
      if (!promoteurId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { status, projectId, limit = 50, page = 1 } = req.query;

      const query: any = { promoteur: promoteurId };

      if (status) {
        query.status = status;
      }

      if (projectId) {
        query.project = projectId;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const requests = await DocumentAccessRequest.find(query)
        .populate('document', 'name category visibility')
        .populate('project', 'name')
        .populate('client', 'email firstName lastName')
        .populate('conversation', '_id')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string));

      const total = await DocumentAccessRequest.countDocuments(query);

      res.json({
        success: true,
        requests,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error: any) {
      console.error('[DocumentAccessRequest] Error getting requests:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  /**
   * Grant access to a document
   */
  static async grantAccess(req: AuthRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const { notes } = req.body;
      const userPromoteur = req.user?.promoteurProfile || req.user?.id;

      const accessRequest = await DocumentAccessRequest.findById(requestId);
      if (!accessRequest) {
        return res.status(404).json({ error: 'Request not found' });
      }

      // Verify ownership - check if user owns the project
      const project = await Project.findById(accessRequest.project);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      const projectPromoteur = project.promoteur.toString();

      console.log('[grantAccess] Ownership check:', {
        projectPromoteur,
        userPromoteur: String(userPromoteur),
        match: projectPromoteur === String(userPromoteur),
      });

      if (projectPromoteur !== String(userPromoteur)) {
        return res.status(403).json({
          error: 'Not authorized',
          details: {
            projectPromoteur,
            userPromoteur: String(userPromoteur),
          },
        });
      }

      const document = await Document.findById(accessRequest.document);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Add client to sharedWith array if not already there
      if (!document.sharedWith.some((id) => id.toString() === accessRequest.client.toString())) {
        document.sharedWith.push(accessRequest.client);
        document.visibility = 'shared';
        await document.save();
      }

      // Update request status
      accessRequest.status = 'approved';
      accessRequest.respondedAt = new Date();
      accessRequest.respondedBy = new mongoose.Types.ObjectId(String(userPromoteur));
      accessRequest.promoteurNotes = notes || undefined;
      await accessRequest.save();

      res.json({
        success: true,
        message: 'Access granted',
        accessRequest: accessRequest.toObject(),
      });
    } catch (error: any) {
      console.error('[DocumentAccessRequest] Error granting access:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  /**
   * Deny access to a document
   */
  static async denyAccess(req: AuthRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const { notes } = req.body;
      const userPromoteur = req.user?.promoteurProfile || req.user?.id;

      const accessRequest = await DocumentAccessRequest.findById(requestId);
      if (!accessRequest) {
        return res.status(404).json({ error: 'Request not found' });
      }

      // Verify ownership - check if user owns the project
      const project = await Project.findById(accessRequest.project);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectPromoteur = project.promoteur.toString();

      if (projectPromoteur !== String(userPromoteur)) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Update request status
      accessRequest.status = 'denied';
      accessRequest.respondedAt = new Date();
      accessRequest.respondedBy = new mongoose.Types.ObjectId(String(userPromoteur));
      accessRequest.promoteurNotes = notes || undefined;
      await accessRequest.save();

      res.json({
        success: true,
        message: 'Request denied',
        accessRequest: accessRequest.toObject(),
      });
    } catch (error: any) {
      console.error('[DocumentAccessRequest] Error denying access:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  /**
   * Get request details with conversation
   */
  static async getRequestDetails(req: AuthRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const userPromoteur = req.user?.promoteurProfile || req.user?.id;

      const accessRequest = await DocumentAccessRequest.findById(requestId)
        .populate('document', 'name category visibility description')
        .populate('project', 'name description promoteur')
        .populate('client', 'email firstName lastName avatar')
        .populate('conversation');

      if (!accessRequest) {
        return res.status(404).json({ error: 'Request not found' });
      }

      // Verify ownership - check if user owns the project
      const project = accessRequest.project as any;
      if (!project || !project.promoteur) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectPromoteur = project.promoteur._id?.toString() || project.promoteur.toString();

      if (projectPromoteur !== String(userPromoteur)) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      res.json({
        success: true,
        accessRequest: accessRequest.toObject(),
      });
    } catch (error: any) {
      console.error('[DocumentAccessRequest] Error getting request details:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
}
