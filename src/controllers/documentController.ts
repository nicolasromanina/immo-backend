import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import Document from '../models/Document';
import Project from '../models/Project';
import User from '../models/User';
import { AuditLogService } from '../services/AuditLogService';
import { TrustScoreService } from '../services/TrustScoreService';
import { DataRoomService } from '../services/DataRoomService';

export class DocumentController {
  /**
   * Upload document
   */
  static async uploadDocument(req: AuthRequest, res: Response) {
    try {
      const {
        projectId,
        name,
        type,
        category,
        url,
        size,
        visibility,
        description,
        tags,
        expiresAt,
      } = req.body;

      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(403).json({ message: 'Only promoteurs can upload documents' });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check ownership
      if (project.promoteur.toString() !== user.promoteurProfile.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const { PlanLimitService } = await import('../services/PlanLimitService');
      const docLimit = await PlanLimitService.checkProjectDocumentLimit(
        user.promoteurProfile.toString(),
        projectId,
        1
      );
      if (!docLimit.allowed) {
        return res.status(403).json({
          message: 'Limite de documents atteinte pour votre plan',
          details: {
            limit: docLimit.limit,
            current: docLimit.current,
            requested: 1,
          },
          upgrade: true,
        });
      }

      const document = new Document({
        project: new mongoose.Types.ObjectId(projectId),
        promoteur: user.promoteurProfile,
        name,
        type,
        category,
        url,
        size,
        visibility: visibility || 'private',
        description,
        tags: tags || [],
        uploadedBy: user._id,
        uploadedAt: new Date(),
        status: 'en-attente',
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        version: 1,
        verified: false,
      });

      await document.save();
      // eslint-disable-next-line no-console
      console.log(`[Backend] Document enregistré: ${document._id} pour le projet ${projectId}`);
      // eslint-disable-next-line no-console
      console.log('[Backend] Champs du document enregistré:', document.toObject());
      
      // DEBUG: Verify document exists immediately
      const verifyDoc = await Document.findById(document._id);
      // eslint-disable-next-line no-console
      console.log('[Backend] Vérification - Document trouvé par ID?', !!verifyDoc);
      if (verifyDoc) {
        // eslint-disable-next-line no-console
        console.log('[Backend] Document trouvé - project:', verifyDoc.project.toString());
      }

      // Recalculate project trust score
      await TrustScoreService.calculateProjectTrustScore(projectId);

      await AuditLogService.logFromRequest(
        req,
        'upload_document',
        'document',
        `Uploaded ${category} document: ${name}`,
        'Document',
        document._id.toString()
      );

      res.status(201).json({ document });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get documents for a project
   */
  static async getProjectDocuments(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const { category, visibility, status } = req.query;

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const { Types } = require('mongoose');
      const query: any = { project: new Types.ObjectId(projectId) };
      // eslint-disable-next-line no-console
      console.log('[Backend] Query utilisée pour la recherche de documents:', query);
      // eslint-disable-next-line no-console
      console.log('[Backend] Recherche dans la collection Document...');

      // If admin, show all documents. If promoteur and owner, show all. Otherwise, only public.
      const user = await User.findById(req.user?.id);
      const { Role } = require('../config/roles');
      const isAdmin = req.user?.roles && req.user.roles.includes(Role.ADMIN);
      const isOwner = user?.promoteurProfile?.toString() === project.promoteur.toString();

      // eslint-disable-next-line no-console
      console.log('[Backend] Vérification d\'identité:');
      // eslint-disable-next-line no-console
      console.log('  - userId:', req.user?.id);
      // eslint-disable-next-line no-console
      console.log('  - user.promoteurProfile:', user?.promoteurProfile?.toString());
      // eslint-disable-next-line no-console
      console.log('  - project.promoteur:', project.promoteur?.toString());
      // eslint-disable-next-line no-console
      console.log('  - isAdmin:', isAdmin);
      // eslint-disable-next-line no-console
      console.log('  - isOwner:', isOwner);

      if (!isAdmin) {
        if (!isOwner) {
          query.visibility = 'public';
          // eslint-disable-next-line no-console
          console.log('[Backend] Utilisateur NON propriétaire - filtre visibility = public appliqué');
        } else {
          if (visibility) query.visibility = visibility;
          // eslint-disable-next-line no-console
          console.log('[Backend] Utilisateur est propriétaire - pas de filtre visibility');
        }
      } else {
        // eslint-disable-next-line no-console
        console.log('[Backend] Admin - pas de filtre visibility');
      }

      if (category) query.category = category;
      if (status) query.status = status;

      // eslint-disable-next-line no-console
      console.log('[Backend] Query finale avant find:', JSON.stringify(query, null, 2));
      
      const documents = await Document.find(query)
        .sort({ createdAt: -1 })
        .populate('uploadedBy', 'firstName lastName');

      // eslint-disable-next-line no-console
      console.log(`[Backend] Résultat: ${documents.length} documents trouvés`);
      
      if (documents.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[Backend] Documents found for project ${projectId}:`, documents.map(d => d._id.toString()));
      } else {
        // eslint-disable-next-line no-console
        console.log(`[Backend] No documents found for project ${projectId}`);
        
        // DEBUG: Check if ANY documents exist in collection
        const allDocs = await Document.countDocuments();
        // eslint-disable-next-line no-console
        console.log(`[Backend] Total documents in collection: ${allDocs}`);
      }
      res.json({ documents, isOwner });
    } catch (error) {
      console.error('Error getting documents:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get single document
   */
  static async getDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const document = await Document.findById(id)
        .populate('project', 'title slug')
        .populate('uploadedBy', 'firstName lastName');

      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Check access
      const user = await User.findById(req.user?.id);
      const isOwner = user?.promoteurProfile?.toString() === document.promoteur.toString();
      const isSharedWith = document.sharedWith.some(
        (userId: any) => userId.toString() === req.user?.id
      );

      if (document.visibility === 'private' && !isOwner && !isSharedWith) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json({ document });
    } catch (error) {
      console.error('Error getting document:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update document
   */
  static async updateDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user!.id);

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Check ownership
      if (document.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const allowedFields = [
        'name',
        'description',
        'visibility',
        'tags',
        'status',
        'expiresAt',
      ];

      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          (document as any)[key] = req.body[key];
        }
      });

      await document.save();

      res.json({ document });
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Replace document (new version)
   */
  static async replaceDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { url, size } = req.body;
      const user = await User.findById(req.user!.id);

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Check ownership
      if (document.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Save previous version
      document.previousVersions.push({
        url: document.url,
        uploadedAt: document.uploadedAt,
        replacedBy: user._id as any,
      });

      // Update to new version
      document.url = url;
      document.size = size;
      document.version += 1;
      document.uploadedAt = new Date();
      document.uploadedBy = user._id as any;
      document.verified = false; // Reset verification

      await document.save();

      await AuditLogService.logFromRequest(
        req,
        'replace_document',
        'document',
        `Replaced document ${document.name} with version ${document.version}`,
        'Document',
        id
      );

      res.json({ document });
    } catch (error) {
      console.error('Error replacing document:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Share document with users
   */
  static async shareDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { userIds } = req.body; // Array of user IDs
      const user = await User.findById(req.user!.id);

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Check ownership
      if (document.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Add users to sharedWith (avoid duplicates)
      const newUserIds = userIds.filter(
        (userId: string) => !document.sharedWith.some((id: any) => id.toString() === userId)
      );

      document.sharedWith.push(...newUserIds.map((id: string) => id as any));
      document.visibility = 'shared';

      await document.save();

      res.json({ document });
    } catch (error) {
      console.error('Error sharing document:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user!.id);

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Check ownership
      if (document.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Actually delete the document
      await Document.deleteOne({ _id: id });

      await AuditLogService.logFromRequest(
        req,
        'delete_document',
        'document',
        `Deleted document: ${document.name}`,
        'Document',
        id
      );

      // Recalculate project trust score
      await TrustScoreService.calculateProjectTrustScore(document.project.toString());

      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get document categories with counts
   */
  static async getDocumentStats(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const user = await User.findById(req.user?.id);

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const isOwner = user?.promoteurProfile?.toString() === project.promoteur.toString();

      const query: any = { project: projectId };
      if (!isOwner) {
        query.visibility = 'public';
      }

      const stats = await Document.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$category',
            total: { $sum: 1 },
            public: {
              $sum: { $cond: [{ $eq: ['$visibility', 'public'] }, 1, 0] }
            },
            fourni: {
              $sum: { $cond: [{ $eq: ['$status', 'fourni'] }, 1, 0] }
            },
            expire: {
              $sum: { $cond: [{ $eq: ['$status', 'expire'] }, 1, 0] }
            },
          },
        },
      ]);

      res.json({ stats });
    } catch (error) {
      console.error('Error getting document stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
  /**
   * Create share link for document
   */
  static async createShareLink(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { expiresAt, maxAccess, password } = req.body;

      const result = await DataRoomService.createShareLink(id, req.user!.id, {
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        maxAccess,
        password
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Access shared document
   */
  static async accessSharedDocument(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { password } = req.query;

      const result = await DataRoomService.accessSharedDocument(token, password as string);

      res.json(result);
    } catch (error: any) {
      res.status(error.message.includes('Invalid') ? 404 : 400).json({ message: error.message });
    }
  }

  /**
   * Get share links for document
   */
  static async getShareLinks(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const shareLinks = await DataRoomService.getShareLinks(id, req.user!.id);

      res.json({ shareLinks });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Revoke share link
   */
  static async revokeShareLink(req: AuthRequest, res: Response) {
    try {
      const { tokenId } = req.params;
      const shareToken = await DataRoomService.revokeShareLink(tokenId, req.user!.id);

      res.json({ shareToken });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Create data room for project
   */
  static async createDataRoom(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { documentIds, expiresAt, password } = req.body;

      const result = await DataRoomService.createDataRoom(id, documentIds, req.user!.id, {
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        password
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Access data room
   */
  static async accessDataRoom(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { password } = req.query;

      const result = await DataRoomService.accessDataRoom(token, password as string);

      res.json(result);
    } catch (error: any) {
      res.status(error.message.includes('Invalid') ? 404 : 400).json({ message: error.message });
    }
  }

  /**
   * Approve a document (admin only)
   */
  static async approveDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const document = await Document.findById(id);

      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      document.status = 'fourni';
      document.verified = true;
      document.verifiedBy = req.user!.id as any;
      document.verifiedAt = new Date();

      await document.save();

      // Log the approval
      await AuditLogService.log({
        action: 'document_approved',
        category: 'document',
        actor: req.user!.id,
        targetType: 'Document',
        targetId: document._id.toString(),
        description: `Document "${document.name}" approved`,
        metadata: { documentName: document.name },
      });

      // Recalculate trust score if applicable
      if (document.promoteur) {
        await TrustScoreService.updateAllScores(document.promoteur.toString());
      }

      res.json({
        success: true,
        data: document,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error approving document',
      });
    }
  }

  /**
   * Reject a document (admin only)
   */
  static async rejectDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const document = await Document.findById(id);

      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      document.status = 'fourni';
      document.verified = false;
      document.verifiedBy = req.user!.id as any;
      document.verifiedAt = new Date();
      
      if (reason) {
        document.verificationNotes = reason;
      }

      await document.save();

      // Log the rejection
      await AuditLogService.log({
        action: 'document_rejected',
        category: 'document',
        actor: req.user!.id,
        targetType: 'Document',
        targetId: document._id.toString(),
        description: `Document "${document.name}" rejected` + (reason ? `: ${reason}` : ''),
        metadata: { documentName: document.name, reason },
      });

      res.json({
        success: true,
        data: document,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error rejecting document',
      });
    }
  }
}
