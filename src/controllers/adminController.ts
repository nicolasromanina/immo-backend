import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Promoteur from '../models/Promoteur';
import Project from '../models/Project';
import User from '../models/User';
import Appeal from '../models/Appeal';
import Report from '../models/Report';
import Badge from '../models/Badge';
import Document from '../models/Document';
import Alert from '../models/Alert';
import { AuditLogService } from '../services/AuditLogService';
import { TrustScoreService } from '../services/TrustScoreService';
import { AdvancedTrustScoreService } from '../services/AdvancedTrustScoreService';
import { NotificationService } from '../services/NotificationService';
import { BadgeService } from '../services/BadgeService';
import { DocumentExpiryService } from '../services/DocumentExpiryService';

export class AdminController {
  /**
   * Get dashboard stats
   */
  static async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const totalPromoteurs = await Promoteur.countDocuments();
      const totalProjects = await Project.countDocuments();
      const publishedProjects = await Project.countDocuments({ publicationStatus: 'published' });
      const pendingProjects = await Project.countDocuments({ publicationStatus: 'pending' });
      
      const verifiedPromoteurs = await Promoteur.countDocuments({ kycStatus: 'verified' });
      const pendingKYC = await Promoteur.countDocuments({ kycStatus: 'submitted' });
      
      const pendingAppeals = await Appeal.countDocuments({ status: 'pending' });
      const pendingReports = await Report.countDocuments({ status: 'pending' });

      const stats = {
        promoteurs: {
          total: totalPromoteurs,
          verified: verifiedPromoteurs,
          pendingKYC,
        },
        projects: {
          total: totalProjects,
          published: publishedProjects,
          pending: pendingProjects,
        },
        moderation: {
          pendingAppeals,
          pendingReports,
        },
      };

      res.json({ stats });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get all promoteurs (with filters)
   */
  static async getPromoteurs(req: AuthRequest, res: Response) {
    try {
      const { kycStatus, plan, page = 1, limit = 20 } = req.query;

      const query: any = {};
      if (kycStatus) query.kycStatus = kycStatus;
      if (plan) query.plan = plan;

      const skip = (Number(page) - 1) * Number(limit);

      const promoteurs = await Promoteur.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .populate('user', 'email firstName lastName');

      const total = await Promoteur.countDocuments(query);

      res.json({
        promoteurs,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error getting promoteurs:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get a promoteur by ID (admin)
   */
  static async getPromoteur(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const promoteur = await Promoteur.findById(id)
        .populate('user', 'email firstName lastName')
        .populate('badges.badgeId')
        .populate('teamMembers.userId', 'firstName lastName email');

      console.log('[AdminController.getPromoteur] requested id:', id, 'found:', promoteur ? promoteur._id : null);

      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      res.json({ promoteur });
    } catch (error) {
      console.error('Error getting promoteur:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get all projects (admin view, includes unpublished/pending)
   */
  static async getProjects(req: AuthRequest, res: Response) {
    try {
      const {
        country,
        city,
        projectType,
        minPrice,
        maxPrice,
        minScore,
        status,
        search,
        sort = '-createdAt',
        page = 1,
        limit = 20,
      } = req.query;

      const query: any = {};

      // Filters
      if (country) query.country = country;
      if (city) query.city = city;
      if (projectType) query.projectType = projectType;
      if (minPrice || maxPrice) {
        query.priceFrom = {};
        if (minPrice) query.priceFrom.$gte = Number(minPrice);
        if (maxPrice) query.priceFrom.$lte = Number(maxPrice);
      }
      if (minScore) query.trustScore = { $gte: Number(minScore) };
      if (status) query.publicationStatus = status;

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { area: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);

      // For admins include moderation notes & unpublished projects
      const projects = await Project.find(query)
        .sort(sort as string)
        .limit(Number(limit))
        .skip(skip)
        .populate('promoteur', 'organizationName trustScore badges plan');

      const total = await Project.countDocuments(query);

      res.json({
        projects,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error getting admin projects:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Verify promoteur KYC
   */
  static async verifyKYC(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { approved, rejectionReason } = req.body;

      const promoteur = await Promoteur.findById(id).populate('user');
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      if (approved) {
        promoteur.kycStatus = 'verified';
        
        // Mark KYC documents as verified
        promoteur.kycDocuments.forEach(doc => {
          if (doc.status === 'pending') {
            doc.status = 'verified';
          }
        });

        // Recalculate trust score
        await TrustScoreService.updateAllScores(id);

        // Check for badges
        await BadgeService.checkAndAwardBadges(id);

        // Notify promoteur
        if (promoteur.user) {
          await NotificationService.create({
            recipient: (promoteur.user as any)._id.toString(),
            type: 'system',
            title: 'KYC Vérifié',
            message: 'Votre identité a été vérifiée avec succès',
            priority: 'high',
            channels: { inApp: true, email: true },
          });
        }
      } else {
        promoteur.kycStatus = 'rejected';
        
        // Notify with reason
        if (promoteur.user) {
          await NotificationService.create({
            recipient: (promoteur.user as any)._id.toString(),
            type: 'warning',
            title: 'KYC Rejeté',
            message: rejectionReason || 'Votre dossier KYC a été rejeté',
            priority: 'urgent',
            channels: { inApp: true, email: true },
          });
        }
      }

      await promoteur.save();

      await AuditLogService.logFromRequest(
        req,
        approved ? 'verify_kyc' : 'reject_kyc',
        'moderation',
        `${approved ? 'Verified' : 'Rejected'} KYC for ${promoteur.organizationName}`,
        'Promoteur',
        id
      );

      res.json({ promoteur });
    } catch (error) {
      console.error('Error verifying KYC:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Admin: recent activity for dashboard
   */
  static async getRecentActivity(req: AuthRequest, res: Response) {
    try {
      const { limit = 10 } = req.query;
      const { logs } = await AuditLogService.getLogs({ limit: Number(limit) });

      const activities = logs.map((l: any) => ({
        id: l._id,
        type: l.category,
        actor: l.actor,
        message: l.description,
        metadata: l.metadata,
        timestamp: l.timestamp,
      }));

      res.json(activities);
    } catch (error) {
      console.error('Error getting recent activity:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Admin: list alerts
   */
  static async getAlerts(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 50, isActive } = req.query;
      const query: any = {};
      if (isActive !== undefined) query.isActive = isActive === 'true';

      const skip = (Number(page) - 1) * Number(limit);
      const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(Number(limit)).skip(skip);
      const total = await Alert.countDocuments(query);

      res.json({ alerts, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) } });
    } catch (error) {
      console.error('Error getting admin alerts:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Review compliance upgrade request
   */
  static async reviewComplianceRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { approved, reason } = req.body;

      const promoteur = await Promoteur.findById(id).populate('user');
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      if (!promoteur.complianceRequest || promoteur.complianceRequest.status !== 'pending') {
        return res.status(400).json({ message: 'No pending compliance request' });
      }

      if (approved) {
        promoteur.complianceStatus = promoteur.complianceRequest.requestedStatus;
        promoteur.complianceRequest.status = 'approved';
        promoteur.complianceRequest.reviewedAt = new Date();
        promoteur.complianceRequest.reviewedBy = req.user!.id as any;
      } else {
        promoteur.complianceRequest.status = 'rejected';
        promoteur.complianceRequest.reviewedAt = new Date();
        promoteur.complianceRequest.reviewedBy = req.user!.id as any;
        promoteur.complianceRequest.reason = reason || promoteur.complianceRequest.reason;
      }

      await promoteur.save();

      if (promoteur.user) {
        await NotificationService.create({
          recipient: (promoteur.user as any)._id.toString(),
          type: approved ? 'system' : 'warning',
          title: approved ? 'Statut de conformite approuve' : 'Statut de conformite rejete',
          message: approved
            ? `Votre statut est passé à "${promoteur.complianceStatus}"`
            : (reason || 'Votre demande de conformité a été rejetée'),
          priority: approved ? 'high' : 'urgent',
          channels: { inApp: true, email: true },
        });
      }

      await AuditLogService.logFromRequest(
        req,
        approved ? 'approve_compliance' : 'reject_compliance',
        'moderation',
        `${approved ? 'Approved' : 'Rejected'} compliance upgrade for ${promoteur.organizationName}`,
        'Promoteur',
        id,
        { requestedStatus: promoteur.complianceRequest.requestedStatus }
      );

      res.json({ promoteur });
    } catch (error) {
      console.error('Error reviewing compliance request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Approve/Reject project publication
   */
  static async moderateProject(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { approved, rejectionReason, moderationNotes } = req.body;

      const project = await Project.findById(id).populate('promoteur');
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (approved) {
        project.publicationStatus = 'published';
        project.rejectionReason = undefined;
      } else {
        project.publicationStatus = 'rejected';
        project.rejectionReason = rejectionReason;
      }

      if (moderationNotes) {
        project.moderationNotes.push({
          note: moderationNotes,
          addedBy: req.user!.id as any,
          addedAt: new Date(),
        });
      }

      await project.save();

      await AuditLogService.logFromRequest(
        req,
        approved ? 'approve_project' : 'reject_project',
        'moderation',
        `${approved ? 'Approved' : 'Rejected'} project: ${project.title}`,
        'Project',
        id
      );

      res.json({ project });
    } catch (error) {
      console.error('Error moderating project:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Feature or unfeature a project
   */
  static async setProjectFeatured(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { featured, featuredUntil } = req.body;

      const project = await Project.findById(id).populate('promoteur');
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      project.isFeatured = Boolean(featured);
      project.featuredUntil = featuredUntil ? new Date(featuredUntil) : undefined;

      await project.save();

      const promoteur: any = project.promoteur;
      if (promoteur?.user) {
        await NotificationService.create({
          recipient: promoteur.user.toString(),
          type: 'project',
          title: project.isFeatured ? 'Projet mis en avant' : 'Projet retire de la mise en avant',
          message: project.isFeatured
            ? `Votre projet "${project.title}" est mis en avant`
            : `Votre projet "${project.title}" a ete retire de la mise en avant`,
          relatedProject: project._id.toString(),
          priority: 'medium',
          channels: { inApp: true, email: true },
        });
      }

      await AuditLogService.logFromRequest(
        req,
        'set_project_featured',
        'moderation',
        `${project.isFeatured ? 'Featured' : 'Unfeatured'} project: ${project.title}`,
        'Project',
        id,
        { featured: project.isFeatured, featuredUntil: project.featuredUntil }
      );

      res.json({ project });
    } catch (error) {
      console.error('Error setting project featured:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Apply restriction/sanction to promoteur
   */
  static async applyRestriction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { type, reason, expiresAt } = req.body;

      const promoteur = await Promoteur.findById(id).populate('user');
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      promoteur.restrictions.push({
        type,
        reason,
        appliedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      await promoteur.save();

      // Recalculate trust score
      await TrustScoreService.updateAllScores(id);

      // Notify promoteur
      if (promoteur.user) {
        await NotificationService.notifyWarning({
          userId: (promoteur.user as any)._id.toString(),
          reason,
          action: `Restriction appliquée: ${type}`,
        });
      }

      await AuditLogService.logFromRequest(
        req,
        'apply_restriction',
        'moderation',
        `Applied restriction to ${promoteur.organizationName}: ${type}`,
        'Promoteur',
        id,
        { type, reason }
      );

      res.json({ promoteur });
    } catch (error) {
      console.error('Error applying restriction:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get pending appeals
   */
  static async getAppeals(req: AuthRequest, res: Response) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const query: any = {};
      if (status) query.status = status;

      const skip = (Number(page) - 1) * Number(limit);

      const appeals = await Appeal.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .populate('promoteur', 'organizationName')
        .populate('project', 'title')
        .populate('assignedTo', 'firstName lastName');

      const total = await Appeal.countDocuments(query);

      res.json({
        appeals,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error getting appeals:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Process appeal
   */
  static async processAppeal(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { outcome, explanation, newAction } = req.body;

      const appeal = await Appeal.findById(id).populate('promoteur');
      if (!appeal) {
        return res.status(404).json({ message: 'Appeal not found' });
      }

      appeal.status = outcome === 'approved' ? 'approved' : 'rejected';
      appeal.resolvedAt = new Date();
      appeal.decision = {
        outcome,
        explanation,
        decidedBy: req.user!.id as any,
        decidedAt: new Date(),
        newAction,
      };

      await appeal.save();

      // Notify promoteur
      const promoteur = appeal.promoteur as any;
      if (promoteur?.user) {
        await NotificationService.create({
          recipient: promoteur.user.toString(),
          type: 'appeal',
          title: `Appel ${outcome === 'approved' ? 'Approuvé' : 'Rejeté'}`,
          message: explanation,
          relatedAppeal: appeal._id.toString(),
          priority: 'high',
          channels: { inApp: true, email: true },
        });
      }

      await AuditLogService.logFromRequest(
        req,
        'process_appeal',
        'appeal',
        `Processed appeal: ${outcome}`,
        'Appeal',
        id,
        { outcome }
      );

      res.json({ appeal });
    } catch (error) {
      console.error('Error processing appeal:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get reports
   */
  static async getReports(req: AuthRequest, res: Response) {
    try {
      const { status, targetType, page = 1, limit = 20 } = req.query;

      const query: any = {};
      if (status) query.status = status;
      if (targetType) query.targetType = targetType;

      const skip = (Number(page) - 1) * Number(limit);

      const reports = await Report.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .populate('reportedBy', 'email firstName lastName');

      const total = await Report.countDocuments(query);

      res.json({
        reports,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error getting reports:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Process report
   */
  static async processReport(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { action, notes } = req.body;

      const report = await Report.findById(id);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      report.status = action === 'dismiss' ? 'dismissed' : 'resolved';
      report.resolution = {
        action,
        notes,
        resolvedBy: req.user!.id as any,
        resolvedAt: new Date(),
      };

      await report.save();

      await AuditLogService.logFromRequest(
        req,
        'process_report',
        'moderation',
        `Processed report: ${action}`,
        'Report',
        id,
        { action }
      );

      res.json({ report });
    } catch (error) {
      console.error('Error processing report:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Manage badges
   */
  static async manageBadges(req: AuthRequest, res: Response) {
    try {
      const badges = await BadgeService.getAllBadges();
      res.json({ badges });
    } catch (error) {
      console.error('Error getting badges:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Award badge manually
   */
  static async awardBadge(req: AuthRequest, res: Response) {
    try {
      const { promoteurId, badgeId } = req.body;

      const promoteur = await Promoteur.findById(promoteurId).populate('user');
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const badge = await Badge.findById(badgeId);
      if (!badge) {
        return res.status(404).json({ message: 'Badge not found' });
      }

      // Check if already has badge
      const hasBadge = promoteur.badges.some(
        (b: any) => b.badgeId.toString() === badgeId
      );

      if (hasBadge) {
        return res.status(400).json({ message: 'Promoteur already has this badge' });
      }

      const expiresAt = badge.hasExpiration && badge.expirationDays
        ? new Date(Date.now() + badge.expirationDays * 24 * 60 * 60 * 1000)
        : undefined;

      promoteur.badges.push({
        badgeId: badge._id as any,
        earnedAt: new Date(),
        expiresAt,
      });

      await promoteur.save();

      // Notify
      if (promoteur.user) {
        await NotificationService.notifyBadgeEarned({
          userId: (promoteur.user as any)._id.toString(),
          badgeName: badge.name,
          badgeDescription: badge.description,
        });
      }

      await AuditLogService.logFromRequest(
        req,
        'award_badge',
        'moderation',
        `Awarded badge "${badge.name}" to ${promoteur.organizationName}`,
        'Promoteur',
        promoteurId
      );

      res.json({ promoteur });
    } catch (error) {
      console.error('Error awarding badge:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Apply a global manual correction (percentage)
   */
  static async applyBadgeCorrection(req: AuthRequest, res: Response) {
    try {
      const { value } = req.body;

      if (typeof value !== 'number' || value < 0 || value > 100) {
        return res.status(400).json({ message: 'Invalid value; must be 0-100' });
      }

      const updatedCount = await AdvancedTrustScoreService.applyGlobalCorrection(value);

      await AuditLogService.logFromRequest(
        req,
        'apply_badge_correction',
        'moderation',
        `Applied global badge correction: ${value}%`,
        'System',
        undefined,
        { value }
      );

      res.json({ updated: updatedCount });
    } catch (error) {
      console.error('Error applying badge correction:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * List documents with filters (admin)
   */
  static async getDocuments(req: AuthRequest, res: Response) {
    try {
      const { status, category, visibility, promoteurId, projectId, page = 1, limit = 20 } = req.query;

      const query: any = {};
      if (status) query.status = status;
      if (category) query.category = category;
      if (visibility) query.visibility = visibility;
      if (promoteurId) query.promoteur = promoteurId;
      if (projectId) query.project = projectId;

      const skip = (Number(page) - 1) * Number(limit);

      const documents = await Document.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .populate('promoteur', 'organizationName')
        .populate('project', 'title slug')
        .populate('uploadedBy', 'firstName lastName');

      const total = await Document.countDocuments(query);

      res.json({
        documents,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error getting documents:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update document status/visibility (admin)
   */
  static async updateDocumentStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, visibility, verificationNotes } = req.body;

      const document = await Document.findById(id).populate('promoteur');
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      if (status) document.status = status;
      if (visibility) document.visibility = visibility;
      if (verificationNotes) document.verificationNotes = verificationNotes;

      await document.save();

      await AuditLogService.logFromRequest(
        req,
        'update_document_status',
        'document',
        `Updated document status: ${document.name}`,
        'Document',
        id,
        { status, visibility }
      );

      res.json({ document });
    } catch (error) {
      console.error('Error updating document status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Verify or reject a document (admin)
   */
  static async verifyDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { verified, verificationNotes } = req.body;

      const document = await Document.findById(id).populate('promoteur');
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      document.verified = Boolean(verified);
      document.verifiedAt = new Date();
      document.verifiedBy = req.user!.id as any;
      if (verificationNotes) document.verificationNotes = verificationNotes;

      await document.save();

      await AuditLogService.logFromRequest(
        req,
        'verify_document',
        'document',
        `${document.verified ? 'Verified' : 'Rejected'} document: ${document.name}`,
        'Document',
        id,
        { verified: document.verified }
      );

      res.json({ document });
    } catch (error) {
      console.error('Error verifying document:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get missing documents per promoteur (admin)
   */
  static async getMissingDocuments(req: AuthRequest, res: Response) {
    try {
      const { promoteurId } = req.query;

      const match: any = { status: 'manquant' };
      if (promoteurId) match.promoteur = promoteurId;

      const results = await Document.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$promoteur',
            totalMissing: { $sum: 1 },
            categories: { $addToSet: '$category' },
          },
        },
      ]);

      res.json({ results });
    } catch (error) {
      console.error('Error getting missing documents:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Mark expired documents and notify promoteurs (admin)
   */
  static async checkExpiredDocuments(req: AuthRequest, res: Response) {
    try {
      const expiredMarked = await DocumentExpiryService.markExpiredDocuments();

      await AuditLogService.logFromRequest(
        req,
        'check_expired_documents',
        'document',
        `Marked ${expiredMarked} document(s) as expired`
      );

      res.json({ expiredMarked });
    } catch (error) {
      console.error('Error checking expired documents:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get audit logs
   */
  static async getAuditLogs(req: AuthRequest, res: Response) {
    try {
      const {
        category,
        action,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = req.query;

      const filters: any = {
        limit: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
      };

      if (category) filters.category = category as string;
      if (action) filters.action = action as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const { logs, total } = await AuditLogService.getLogs(filters);

      res.json({
        logs,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error getting audit logs:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Apply pending plan change request
   */
  static async applyPlanChange(req: AuthRequest, res: Response) {
    try {
      // route param is defined as :id in the router
      const promoteurId = req.params.id || (req.params as any).promoteurId;
      const { approve } = req.body;

      const promoteur = await Promoteur.findById(promoteurId);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      if (!promoteur.planChangeRequest || promoteur.planChangeRequest.status !== 'pending') {
        return res.status(400).json({ message: 'No pending plan change request' });
      }

      if (!approve) {
        // Reject the request
        promoteur.planChangeRequest.status = 'rejected';
        await promoteur.save();

        await AuditLogService.logFromRequest(
          req,
          'reject_plan_change',
          'promoteur',
          `Rejected plan change request for promoteur ${promoteurId}`,
          'Admin',
          promoteurId
        );

        return res.json({ promoteur });
      }

      // Approve and apply the change
      const { requestedPlan, requestType } = promoteur.planChangeRequest;

      if (requestType === 'cancel') {
        // Archive all projects
        await Project.updateMany(
          { promoteur: promoteurId },
          { status: 'archive' }
        );

        // Update promoteur
        promoteur.plan = 'basique';
        promoteur.subscriptionStatus = 'expired';
        promoteur.subscriptionEndDate = new Date();

      } else if (requestType === 'downgrade') {
        // Apply downgrade
        promoteur.plan = requestedPlan as 'basique' | 'standard' | 'premium';
        promoteur.subscriptionEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Extend for another year

      } else if (requestType === 'upgrade') {
        // Apply upgrade
        promoteur.plan = requestedPlan as 'basique' | 'standard' | 'premium';
        promoteur.subscriptionEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      promoteur.planChangeRequest.status = 'approved';

      await promoteur.save();

      await AuditLogService.logFromRequest(
        req,
        'apply_plan_change',
        'promoteur',
        `Applied ${requestType} to ${requestedPlan || 'cancelled'} for promoteur ${promoteurId}`,
        'Admin',
        promoteurId
      );

      res.json({ promoteur });
    } catch (error) {
      console.error('Error applying plan change:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
