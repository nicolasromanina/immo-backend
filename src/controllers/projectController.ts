import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Project from '../models/Project';
import Promoteur from '../models/Promoteur';
import User from '../models/User';
import Favorite from '../models/Favorite';
import { AuditLogService } from '../services/AuditLogService';
import { TrustScoreService } from '../services/TrustScoreService';
import { BadgeService } from '../services/BadgeService';
import { OnboardingService } from '../services/OnboardingService';
import { NotificationService } from '../services/NotificationService';

export class ProjectController {
  private static normalizeMediaItems(items: Array<any>): Array<{ url: string; mimeType?: string; sizeBytes?: number; uploadedAt?: Date }> {
    return (items || []).map(item =>
      typeof item === 'string' ? { url: item } : item
    );
  }

  private static uniqueByUrl(items: Array<{ url?: string; mimeType?: string; sizeBytes?: number; uploadedAt?: Date }>) {
    const seen = new Set<string>();
    return items.filter((item): item is { url: string; mimeType?: string; sizeBytes?: number; uploadedAt?: Date } => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }

  private static readonly mediaConfig: Record<string, { key: string; maxSize: number; mimeTypes: string[] }> = {
    renderings: {
      key: 'renderings',
      maxSize: 20 * 1024 * 1024,
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    photos: {
      key: 'photos',
      maxSize: 20 * 1024 * 1024,
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    videos: {
      key: 'videos',
      maxSize: 200 * 1024 * 1024,
      mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    },
    floorPlans: {
      key: 'floorPlans',
      maxSize: 20 * 1024 * 1024,
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    },
  };

  private static resolveMediaKey(mediaType: string) {
    if (mediaType === 'floor-plans') return 'floorPlans';
    if (mediaType === 'renderings') return 'renderings';
    if (mediaType === 'photos') return 'photos';
    if (mediaType === 'videos') return 'videos';
    return null;
  }

  private static validateMediaItem(item: { url?: string; mimeType?: string; sizeBytes?: number }, config: { maxSize: number; mimeTypes: string[] }) {
    if (!item.url || typeof item.url !== 'string') {
      return 'Invalid url';
    }
    if (!item.mimeType || typeof item.mimeType !== 'string') {
      return 'mimeType is required';
    }
    if (!item.sizeBytes || typeof item.sizeBytes !== 'number') {
      return 'sizeBytes is required';
    }
    if (!config.mimeTypes.includes(item.mimeType)) {
      return 'Unsupported media format';
    }
    if (item.sizeBytes > config.maxSize) {
      return 'File too large';
    }
    return null;
  }

  private static async canManageProjectTeam(userId: string, promoteurId: string) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return false;

    if (promoteur.user.toString() === userId) return true;

    const teamMember = promoteur.teamMembers.find(m => m.userId.toString() === userId);
    return teamMember?.role === 'admin';
  }

  /**
   * Check if user can access (read/write) a project
   * Owner can always access, team members can access if they belong to the promoteur
   */
  private static async canAccessProject(userId: string, projectId: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user?.promoteurProfile) return false;

    const project = await Project.findById(projectId);
    if (!project) return false;

    // Owner can always access
    if (project.promoteur.toString() === user.promoteurProfile.toString()) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can modify a project
   * Owner can always modify, team members with admin role can modify
   */
  private static async canModifyProject(userId: string, projectId: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user?.promoteurProfile) return false;

    const project = await Project.findById(projectId);
    if (!project) return false;

    // Check if project belongs to the user's promoteur organization
    if (project.promoteur.toString() !== user.promoteurProfile.toString()) {
      return false;
    }

    // Get the promoteur to check if user is a team member
    const promoteur = await Promoteur.findById(project.promoteur);
    if (!promoteur) return false;

    // Owner can always modify
    if (promoteur.user.toString() === userId) return true;

    // Team members with admin role can modify
    const teamMember = promoteur.teamMembers.find(m => m.userId.toString() === userId);
    return teamMember?.role === 'admin';
  }

  /**
   * Create a new project
   */
  static async createProject(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(403).json({ message: 'Only promoteurs can create projects' });
      }

      // Check plan limits
      const { PlanLimitService } = await import('../services/PlanLimitService');
      const canCreate = await PlanLimitService.checkProjectLimit(user.promoteurProfile.toString());
      if (!canCreate) {
        return res.status(403).json({
          message: 'Limite de projets atteinte pour votre plan',
          upgrade: true
        });
      }

      const {
        title,
        description,
        projectType,
        typeDetails,
        country,
        city,
        area,
        address,
        coordinates,
        typologies,
        priceFrom,
        currency,
        timeline,
        features,
        amenities,
      } = req.body;

      if (projectType === 'villa') {
        if (!typeDetails?.villa || !typeDetails.villa.landArea || !typeDetails.villa.units) {
          return res.status(400).json({
            message: 'Villa projects require typeDetails.villa.landArea and typeDetails.villa.units',
          });
        }
      }

      if (projectType === 'immeuble') {
        if (!typeDetails?.immeuble || !typeDetails.immeuble.floors || !typeDetails.immeuble.totalUnits) {
          return res.status(400).json({
            message: 'Immeuble projects require typeDetails.immeuble.floors and typeDetails.immeuble.totalUnits',
          });
        }
      }

      // Generate slug from title
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + '-' + Date.now();

      const project = new Project({
        promoteur: user.promoteurProfile,
        title,
        slug,
        description,
        projectType,
        typeDetails,
        country,
        city,
        area,
        address,
        coordinates,
        typologies,
        priceFrom,
        currency: currency || 'EUR',
        timeline,
        status: 'pre-commercialisation',
        publicationStatus: 'draft',
        features: features || [],
        amenities: amenities || [],
        media: {
          renderings: [],
          photos: [],
          videos: [],
          floorPlans: [],
        },
        trustScore: 0,
        completenessScore: 40, // Initial score for basic info
        views: 0,
        favorites: 0,
        totalLeads: 0,
        conversionRate: 0,
        faq: [],
        isFeatured: false,
      });

      await project.save();

      // Update promoteur stats
      await Promoteur.findByIdAndUpdate(user.promoteurProfile, {
        $inc: { totalProjects: 1, activeProjects: 1 },
      });

      // Update onboarding
      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (promoteur) {
        const projectChecklistItem = promoteur.onboardingChecklist.find(
          item => item.code === 'first_project' || item.item.includes('premier projet')
        );
        if (projectChecklistItem && !projectChecklistItem.completed) {
          projectChecklistItem.completed = true;
          projectChecklistItem.completedAt = new Date();
          OnboardingService.recalculate(promoteur);
          
          await promoteur.save();
          
          // Check for badges
          await BadgeService.checkAndAwardBadges(user.promoteurProfile.toString());
        }
      }

      await AuditLogService.logFromRequest(
        req,
        'create_project',
        'project',
        `Created project: ${title}`,
        'Project',
        project._id.toString()
      );

      res.status(201).json({ project });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Add media to a project by type
   */
  static async addProjectMedia(req: AuthRequest, res: Response) {
    try {
      const { id, mediaType } = req.params;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const canModify = await ProjectController.canModifyProject(req.user!.id, id);
      if (!canModify) {
        return res.status(403).json({ message: 'Not authorized to modify this project' });
      }

      const mediaKey = ProjectController.resolveMediaKey(mediaType);
      if (!mediaKey) {
        return res.status(400).json({ message: 'Invalid media type' });
      }

      const config = ProjectController.mediaConfig[mediaKey];
      type MediaItem = { url?: string; mimeType?: string; sizeBytes?: number };
      const items = Array.isArray(req.body.items)
        ? req.body.items
        : req.body.url
          ? [{ url: req.body.url, mimeType: req.body.mimeType, sizeBytes: req.body.sizeBytes }]
          : [];

      if (items.length === 0) {
        return res.status(400).json({ message: 'No media items provided' });
      }

      const invalid = (items as MediaItem[]).find(item => ProjectController.validateMediaItem(item, config));
      if (invalid) {
        const error = ProjectController.validateMediaItem(invalid, config) as string;
        return res.status(400).json({ message: error });
      }

      const normalizedExisting = ProjectController.normalizeMediaItems((project.media as any)[mediaKey] || []);
      const existingUrls = new Set(normalizedExisting.map(item => item.url));
      const normalizedNew = ProjectController.uniqueByUrl((items as MediaItem[]).map(item => ({
        url: item.url,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        uploadedAt: new Date(),
      })));
      const filtered = normalizedNew.filter(item => !existingUrls.has(item.url));

      (project.media as any)[mediaKey] = ProjectController.uniqueByUrl([...normalizedExisting, ...filtered]);

      await project.save();

      const trustScore = await TrustScoreService.calculateProjectTrustScore(project._id.toString());
      project.trustScore = trustScore;
      await project.save();

      await AuditLogService.logFromRequest(
        req,
        'add_project_media',
        'project',
        `Added ${filtered.length} ${mediaKey} item(s)` ,
        'Project',
        project._id.toString(),
        { mediaKey, count: filtered.length }
      );

      res.json({ project });
    } catch (error) {
      console.error('Error adding project media:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get assigned team members for a project
   */
  static async getAssignedTeam(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const project = await Project.findById(id).populate('assignedTeam.userId', 'firstName lastName email');
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Public projects can expose assigned team; otherwise require ownership
      if (project.publicationStatus !== 'published') {
        const user = await User.findById(req.user?.id);
        if (project.promoteur.toString() !== user?.promoteurProfile?.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }

      res.json({ assignedTeam: project.assignedTeam });
    } catch (error) {
      console.error('Error getting assigned team:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Assign a team member to a project
   */
  static async assignTeamMember(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { userId, role } = req.body;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (!user?.promoteurProfile || project.promoteur.toString() !== user.promoteurProfile.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const canManage = await ProjectController.canManageProjectTeam(req.user!.id, project.promoteur.toString());
      if (!canManage) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      if (!['commercial', 'technique'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      const promoteur = await Promoteur.findById(project.promoteur);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const isInTeam = promoteur.teamMembers.some(m => m.userId.toString() === userId);
      if (!isInTeam && promoteur.user.toString() !== userId) {
        return res.status(400).json({ message: 'User is not part of promoteur team' });
      }

      const existing = project.assignedTeam.find(m => m.userId.toString() === userId);
      if (existing) {
        existing.role = role;
      } else {
        project.assignedTeam.push({ userId, role });
      }

      await project.save();

      await AuditLogService.logFromRequest(
        req,
        'assign_project_team_member',
        'project',
        `Assigned team member to project: ${project.title}`,
        'Project',
        project._id.toString(),
        { userId, role }
      );

      res.json({ project });
    } catch (error) {
      console.error('Error assigning team member:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Remove a team member from a project
   */
  static async removeTeamMember(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (!user?.promoteurProfile || project.promoteur.toString() !== user.promoteurProfile.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const canManage = await ProjectController.canManageProjectTeam(req.user!.id, project.promoteur.toString());
      if (!canManage) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const before = project.assignedTeam.length;
      project.assignedTeam = project.assignedTeam.filter(m => m.userId.toString() !== userId);

      if (project.assignedTeam.length === before) {
        return res.status(404).json({ message: 'Team member not assigned' });
      }

      await project.save();

      await AuditLogService.logFromRequest(
        req,
        'remove_project_team_member',
        'project',
        `Removed team member from project: ${project.title}`,
        'Project',
        project._id.toString(),
        { userId }
      );

      res.json({ project });
    } catch (error) {
      console.error('Error removing team member:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Set project cover image
   */
  static async setProjectCoverImage(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { url: bodyUrl, mimeType: bodyMime, sizeBytes: bodySize } = req.body;
      const user = await User.findById(req.user!.id);

      console.debug(`[ProjectController.setProjectCoverImage] incoming request for project ${id} bodyUrl=${bodyUrl}`, { hasFile: !!(req as any).file });

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const canModify = await ProjectController.canModifyProject(req.user!.id, id);
      if (!canModify) {
        return res.status(403).json({ message: 'Not authorized to modify this project' });
      }

      // If a file was uploaded via multipart/form-data, upload to Cloudinary
      const uploadedFile = (req as any).file as { buffer?: Buffer; mimetype?: string; size?: number; originalname?: string } | undefined;
      if (uploadedFile && uploadedFile.buffer) {
        console.debug('[ProjectController.setProjectCoverImage] uploaded file info:', { originalname: uploadedFile.originalname, mimetype: uploadedFile.mimetype, size: uploadedFile.size });

        // Validate mime/size quickly
        const config = { maxSize: 20 * 1024 * 1024, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] };
        const mime = uploadedFile.mimetype || 'application/octet-stream';
        const size = uploadedFile.size || 0;

        const mimeError = config.mimeTypes.includes(mime) ? null : 'Unsupported media format';
        if (mimeError) {
          console.warn('[ProjectController.setProjectCoverImage] reject file - mime not allowed', { mime, filename: uploadedFile.originalname });
          return res.status(400).json({ message: mimeError });
        }
        if (size > config.maxSize) {
          console.warn('[ProjectController.setProjectCoverImage] reject file - too large', { size, maxSize: config.maxSize, filename: uploadedFile.originalname });
          return res.status(400).json({ message: 'File too large' });
        }

        // Upload buffer to Cloudinary
        try {
          const { CloudinaryService } = await import('../services/CloudinaryService');
          const folder = `projects/${project._id}/cover`;
          const publicId = `cover_${Date.now()}`;
          const result = await CloudinaryService.uploadBuffer(uploadedFile.buffer!, { folder, publicId, resourceType: 'image' });
          const finalUrl = result.secure_url || result.url;

          project.media.coverImage = finalUrl;
          await project.save();

          const trustScore = await TrustScoreService.calculateProjectTrustScore(project._id.toString());
          project.trustScore = trustScore;
          await project.save();

          await AuditLogService.logFromRequest(
            req,
            'set_project_cover',
            'project',
            'Uploaded and set project cover image via Cloudinary',
            'Project',
            project._id.toString(),
            { publicId, folder }
          );

          return res.json({ project, uploaded: { publicId, folder, url: finalUrl } });
        } catch (err: any) {
          console.error('Cloudinary upload failed:', err?.message || err, err?.stack || err);
          return res.status(500).json({ message: 'Image upload failed', error: err?.message });
        }
      }

      // Fallback: if client provided url/mime/size in body
      if (bodyUrl) {
        const config = { maxSize: 20 * 1024 * 1024, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] };
        const error = ProjectController.validateMediaItem({ url: bodyUrl, mimeType: bodyMime, sizeBytes: bodySize }, config);
        if (error) {
          return res.status(400).json({ message: error });
        }

        project.media.coverImage = bodyUrl;
        await project.save();

        const trustScore = await TrustScoreService.calculateProjectTrustScore(project._id.toString());
        project.trustScore = trustScore;
        await project.save();

        await AuditLogService.logFromRequest(
          req,
          'set_project_cover',
          'project',
          'Updated project cover image via provided URL',
          'Project',
          project._id.toString()
        );

        return res.json({ project });
      }

      return res.status(400).json({ message: 'No file or url provided' });
    } catch (error) {
      console.error('Error setting project cover:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Remove media from a project by type
   */
  static async removeProjectMedia(req: AuthRequest, res: Response) {
    try {
      const { id, mediaType } = req.params;
      const { url } = req.body;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const canModify = await ProjectController.canModifyProject(req.user!.id, id);
      if (!canModify) {
        return res.status(403).json({ message: 'Not authorized to modify this project' });
      }

      const mediaKey = ProjectController.resolveMediaKey(mediaType);
      if (!mediaKey) {
        return res.status(400).json({ message: 'Invalid media type' });
      }

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: 'url is required' });
      }

      const current = ProjectController.normalizeMediaItems((project.media as any)[mediaKey] || []);
      const next = current.filter(item => item.url !== url);
      (project.media as any)[mediaKey] = next;

      await project.save();

      const trustScore = await TrustScoreService.calculateProjectTrustScore(project._id.toString());
      project.trustScore = trustScore;
      await project.save();

      await AuditLogService.logFromRequest(
        req,
        'remove_project_media',
        'project',
        `Removed ${mediaKey} item` ,
        'Project',
        project._id.toString(),
        { mediaKey }
      );

      res.json({ project });
    } catch (error) {
      console.error('Error removing project media:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * List project media with pagination and ordering
   */
  static async getProjectMedia(req: AuthRequest, res: Response) {
    try {
      const { id, mediaType } = req.params;
      const { page = 1, limit = 20, sort = 'desc' } = req.query as any;

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const mediaKey = ProjectController.resolveMediaKey(mediaType);
      if (!mediaKey) {
        return res.status(400).json({ message: 'Invalid media type' });
      }

      const isPublished = project.publicationStatus === 'published';
      if (!isPublished) {
        const user = await User.findById(req.user?.id);
        if (project.promoteur.toString() !== user?.promoteurProfile?.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }

      let items = ProjectController.normalizeMediaItems((project.media as any)[mediaKey] || []);
      items = ProjectController.uniqueByUrl(items);

      const hasDates = items.some(item => item.uploadedAt);
      if (hasDates) {
        items.sort((a, b) => {
          const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
          const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
          return sort === 'asc' ? aTime - bTime : bTime - aTime;
        });
      } else if (sort === 'desc') {
        items = items.slice().reverse();
      }

      const pageNumber = Math.max(1, Number(page));
      const limitNumber = Math.max(1, Math.min(100, Number(limit)));
      const start = (pageNumber - 1) * limitNumber;
      const end = start + limitNumber;

      const paged = items.slice(start, end);

      res.json({
        items: paged,
        pagination: {
          total: items.length,
          page: pageNumber,
          pages: Math.ceil(items.length / limitNumber),
          limit: limitNumber,
        },
        sort,
      });
    } catch (error) {
      console.error('Error listing project media:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get all projects (with filters)
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
        verifiedOnly,
        search,
        keyword, // Frontend sends keyword instead of search
        sort = '-createdAt',
        page = 1,
        limit = 20,
      } = req.query;

      const query: any = { publicationStatus: 'published' };

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
      if (status) query.status = status;
      
      // Support both 'search' and 'keyword' parameters
      const searchTerm = search || keyword;
      if (searchTerm) {
        query.$or = [
          { title: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { area: { $regex: searchTerm, $options: 'i' } },
        ];
      }

      // For verified only, need to check promoteur
      let promoteurIds: any[] = [];
      if (verifiedOnly === 'true') {
        const verifiedPromoteurs = await Promoteur.find({ 
          plan: { $in: ['standard', 'premium'] }
        }).select('_id');
        promoteurIds = verifiedPromoteurs.map(p => p._id);
        query.promoteur = { $in: promoteurIds };
      }

      const skip = (Number(page) - 1) * Number(limit);

      const projects = await Project.find(query)
        .sort(sort as string)
        .limit(Number(limit))
        .skip(skip)
        .populate('promoteur', 'organizationName trustScore badges plan')
        .select('-changesLog -moderationNotes');

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
      console.error('Error getting projects:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get featured projects
   */
  static async getFeaturedProjects(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20, sort = '-createdAt' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const now = new Date();

      const query: any = {
        publicationStatus: 'published',
        isFeatured: true,
        $or: [{ featuredUntil: { $exists: false } }, { featuredUntil: { $gte: now } }],
      };

      const projects = await Project.find(query)
        .sort(sort as string)
        .limit(Number(limit))
        .skip(skip)
        .populate('promoteur', 'organizationName trustScore badges plan')
        .select('-changesLog -moderationNotes');

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
      console.error('Error getting featured projects:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get Top Verified projects
   */
  static async getTopVerifiedProjects(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20, minScore = 85, sort = '-trustScore' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const promoteurs = await Promoteur.find({ trustScore: { $gte: Number(minScore) } })
        .select('_id');

      const promoteurIds = promoteurs.map(p => p._id);
      const query: any = {
        publicationStatus: 'published',
        promoteur: { $in: promoteurIds },
      };

      const projects = await Project.find(query)
        .sort(sort as string)
        .limit(Number(limit))
        .skip(skip)
        .populate('promoteur', 'organizationName trustScore badges plan')
        .select('-changesLog -moderationNotes');

      const total = await Project.countDocuments(query);

      res.json({
        projects,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
        minScore: Number(minScore),
      });
    } catch (error) {
      console.error('Error getting top verified projects:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get single project by ID or slug
   */
  static async getProject(req: AuthRequest, res: Response) {
    try {
      const { identifier } = req.params;

      // Try to find by ID first, then by slug
      let project = await Project.findById(identifier);
      if (!project) {
        project = await Project.findOne({ slug: identifier });
      }

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Increment views
      project.views += 1;
      await project.save();

      // Populate related data
      await project.populate('promoteur', 'organizationName trustScore badges plan logo');

      // Check if user has favorited this project
      let isFavorited = false;
      if (req.user) {
        const favorite = await Favorite.findOne({
          user: req.user.id,
          project: project._id,
        });
        isFavorited = !!favorite;
      }

      res.json({ project, isFavorited });
    } catch (error) {
      console.error('Error getting project:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update project
   */
  static async updateProject(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check ownership
      if (project.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this project' });
      }

      const allowedFields = [
        'title',
        'description',
        'address',
        'coordinates',
        'typologies',
        'priceFrom',
        'timeline',
        'features',
        'amenities',
        'status',
        'typeDetails',
      ];

      const updates: any = {};
      const changesLog: any[] = [];
      const criticalChanges: string[] = [];

      if (req.body.typeDetails) {
        if (project.projectType === 'villa') {
          if (!req.body.typeDetails.villa || !req.body.typeDetails.villa.landArea || !req.body.typeDetails.villa.units) {
            return res.status(400).json({
              message: 'Villa projects require typeDetails.villa.landArea and typeDetails.villa.units',
            });
          }
        }
        if (project.projectType === 'immeuble') {
          if (!req.body.typeDetails.immeuble || !req.body.typeDetails.immeuble.floors || !req.body.typeDetails.immeuble.totalUnits) {
            return res.status(400).json({
              message: 'Immeuble projects require typeDetails.immeuble.floors and typeDetails.immeuble.totalUnits',
            });
          }
        }
      }

      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key) && req.body[key] !== undefined) {
          // Track changes for important fields
          if (['priceFrom', 'timeline', 'status'].includes(key)) {
            if (JSON.stringify(project[key as keyof typeof project]) !== JSON.stringify(req.body[key])) {
              if (['priceFrom', 'timeline'].includes(key)) {
                criticalChanges.push(key);
              }
              changesLog.push({
                field: key,
                oldValue: project[key as keyof typeof project],
                newValue: req.body[key],
                reason: req.body.changeReason || 'Updated by promoteur',
                changedBy: user!._id,
                changedAt: new Date(),
              });
            }
          }
          updates[key] = req.body[key];
        }
      });

      if (criticalChanges.length > 0 && !req.body.changeReason) {
        return res.status(400).json({ message: 'changeReason is required for price/timeline changes' });
      }

      // Update media if provided
      if (req.body.media) {
        const { coverImage, renderings, photos, videos, floorPlans } = req.body.media;
        if (coverImage !== undefined) updates['media.coverImage'] = coverImage;
        if (renderings !== undefined) updates['media.renderings'] = renderings;
        if (photos !== undefined) updates['media.photos'] = photos;
        if (videos !== undefined) updates['media.videos'] = videos;
        if (floorPlans !== undefined) updates['media.floorPlans'] = floorPlans;
      }

      // Apply updates
      Object.assign(project, updates);

      // Add changes to log
      if (changesLog.length > 0) {
        project.changesLog.push(...changesLog);
      }

      await project.save();

      // Recalculate trust score
      const trustScore = await TrustScoreService.calculateProjectTrustScore(project._id.toString());
      project.trustScore = trustScore;
      await project.save();

      await AuditLogService.logFromRequest(
        req,
        'update_project',
        'project',
        `Updated project: ${project.title}`,
        'Project',
        project._id.toString(),
        { changes: changesLog.length }
      );

      if (criticalChanges.length > 0) {
        const alertOnPrice = criticalChanges.includes('priceFrom');
        const alertOnStatus = criticalChanges.includes('timeline') || criticalChanges.includes('status');

        const favoriteQuery: any = { project: project._id };
        if (alertOnPrice && alertOnStatus) {
          favoriteQuery.$or = [{ alertOnPriceChange: true }, { alertOnStatusChange: true }];
        } else if (alertOnPrice) {
          favoriteQuery.alertOnPriceChange = true;
        } else if (alertOnStatus) {
          favoriteQuery.alertOnStatusChange = true;
        }

        const favorites = await Favorite.find(favoriteQuery).select('user');
        const followerIds = favorites.map(f => f.user.toString());

        if (followerIds.length > 0) {
          await Promise.all(
            followerIds.map(userId =>
              NotificationService.create({
                recipient: userId,
                type: 'project',
                title: 'Changement important sur un projet',
                message: `Le projet "${project.title}" a ete mis a jour. Raison: ${req.body.changeReason}`,
                relatedProject: project._id.toString(),
                priority: 'medium',
                channels: { inApp: true, email: true },
              })
            )
          );
        }
      }

      res.json({ project });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get project changes log
   */
  static async getChangesLog(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const isOwner = project.promoteur.toString() === user?.promoteurProfile?.toString();
      const isFollower = await Favorite.findOne({ user: req.user!.id, project: project._id });

      if (!isOwner && !isFollower) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const changesLog = [...project.changesLog].sort(
        (a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
      );

      res.json({ changesLog });
    } catch (error) {
      console.error('Error getting changes log:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Delete/Archive project
   */
  static async deleteProject(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check ownership
      if (project.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this project' });
      }

      // Archive instead of delete
      project.status = 'archive';
      project.publicationStatus = 'draft';
      await project.save();

      // Update promoteur stats
      await Promoteur.findByIdAndUpdate(user.promoteurProfile, {
        $inc: { activeProjects: -1 },
      });

      await AuditLogService.logFromRequest(
        req,
        'archive_project',
        'project',
        `Archived project: ${project.title}`,
        'Project',
        project._id.toString()
      );

      res.json({ message: 'Project archived successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Submit project for publication
   */
  static async submitForPublication(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check ownership
      if (project.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Check if project has minimum required info
      if (!project.media.coverImage || project.typologies.length === 0) {
        return res.status(400).json({ 
          message: 'Project must have a cover image and at least one typology' 
        });
      }

      project.publicationStatus = 'pending';
      await project.save();

      await AuditLogService.logFromRequest(
        req,
        'submit_project_for_publication',
        'project',
        `Submitted project for publication: ${project.title}`,
        'Project',
        project._id.toString()
      );

      res.json({ project });
    } catch (error) {
      console.error('Error submitting project:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get promoteur's own projects
   */
  static async getMyProjects(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(403).json({ message: 'Only promoteurs can access this' });
      }

      const { status, page = 1, limit = 20 } = req.query;

      const query: any = { promoteur: user.promoteurProfile };
      if (status) query.publicationStatus = status;

      const skip = (Number(page) - 1) * Number(limit);

      const projects = await Project.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip);

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
      console.error('Error getting my projects:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Add FAQ to project
   */
  static async addFAQ(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { question, answer } = req.body;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check ownership
      if (project.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      project.faq.push({
        question,
        answer,
        addedAt: new Date(),
      });

      await project.save();

      res.json({ project });
    } catch (error) {
      console.error('Error adding FAQ:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Report delay
   */
  static async reportDelay(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason, originalDate, newDate, mitigationPlan } = req.body;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check ownership
      if (project.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      project.delays.push({
        reason,
        originalDate: new Date(originalDate),
        newDate: new Date(newDate),
        mitigationPlan,
        reportedAt: new Date(),
      });

      // Update timeline if it's the delivery date
      if (project.timeline.deliveryDate?.toISOString() === new Date(originalDate).toISOString()) {
        project.timeline.deliveryDate = new Date(newDate);
      }

      await project.save();

      await AuditLogService.logFromRequest(
        req,
        'report_delay',
        'project',
        `Reported delay for project: ${project.title}`,
        'Project',
        project._id.toString()
      );

      res.json({ project });
    } catch (error) {
      console.error('Error reporting delay:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Report risk
   */
  static async reportRisk(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { type, description, severity, mitigationPlan } = req.body;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check ownership
      if (project.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      project.risks.push({
        type,
        description,
        severity,
        mitigationPlan,
        status: 'active',
        reportedAt: new Date(),
      });

      await project.save();

      await AuditLogService.logFromRequest(
        req,
        'report_risk',
        'project',
        `Reported ${severity} risk for project: ${project.title}`,
        'Project',
        project._id.toString()
      );

      res.json({ project });
    } catch (error) {
      console.error('Error reporting risk:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Pause project
   */
  static async pauseProject(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason, description, estimatedResumeDate, supportingDocuments } = req.body;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check ownership
      if (project.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Cannot pause if already completed or archived
      if (project.status === 'livre' || project.status === 'archive') {
        return res.status(400).json({ message: 'Cannot pause completed or archived projects' });
      }

      project.status = 'pause';
      project.pauseInfo = {
        reason,
        description,
        pausedAt: new Date(),
        estimatedResumeDate: estimatedResumeDate ? new Date(estimatedResumeDate) : undefined,
        supportingDocuments
      };

      // Add to change log
      project.changesLog.push({
        field: 'status',
        oldValue: project.status,
        newValue: 'pause',
        reason: `Project paused: ${description}`,
        changedBy: req.user!.id as any,
        changedAt: new Date()
      });

      await project.save();

      // TODO: Notify leads/favorites

      await AuditLogService.logFromRequest(
        req,
        'pause_project',
        'project',
        `Paused project: ${project.title}`,
        'Project',
        project._id.toString()
      );

      res.json({ project });
    } catch (error) {
      console.error('Error pausing project:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Resume project
   */
  static async resumeProject(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { newStatus } = req.body;
      const user = await User.findById(req.user!.id);

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check ownership
      if (project.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (project.status !== 'pause') {
        return res.status(400).json({ message: 'Project is not paused' });
      }

      const oldStatus = project.status;
      project.status = newStatus;
      project.pauseInfo = undefined; // Clear pause info

      // Add to change log
      project.changesLog.push({
        field: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
        reason: 'Project resumed',
        changedBy: req.user!.id as any,
        changedAt: new Date()
      });

      await project.save();

      // TODO: Notify leads/favorites

      await AuditLogService.logFromRequest(
        req,
        'resume_project',
        'project',
        `Resumed project: ${project.title}`,
        'Project',
        project._id.toString()
      );

      res.json({ project });
    } catch (error) {
      console.error('Error resuming project:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get project pause history
   */
  static async getPauseHistory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Only show for published projects or owners
      const user = await User.findById(req.user!.id);
      const isOwner = project.promoteur.toString() === user?.promoteurProfile?.toString();

      if (project.publicationStatus !== 'published' && !isOwner) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const pauseHistory = project.changesLog
        .filter(change => change.field === 'status' && (change.oldValue === 'pause' || change.newValue === 'pause'))
        .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());

      res.json({ history: pauseHistory });
    } catch (error) {
      console.error('Error getting pause history:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
