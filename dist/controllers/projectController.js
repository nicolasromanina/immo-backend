"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const User_1 = __importDefault(require("../models/User"));
const Favorite_1 = __importDefault(require("../models/Favorite"));
const Lead_1 = __importDefault(require("../models/Lead"));
const Document_1 = __importDefault(require("../models/Document"));
const AuditLogService_1 = require("../services/AuditLogService");
const TrustScoreService_1 = require("../services/TrustScoreService");
const BadgeService_1 = require("../services/BadgeService");
const OnboardingService_1 = require("../services/OnboardingService");
const NotificationService_1 = require("../services/NotificationService");
class ProjectController {
    static async notifyProjectCriticalStatusChange(params) {
        const [favorites, leads] = await Promise.all([
            Favorite_1.default.find({
                project: params.projectId,
                alertOnStatusChange: true,
            }).select('user'),
            Lead_1.default.find({
                project: params.projectId,
                client: { $exists: true, $ne: null },
            }).select('client'),
        ]);
        const recipients = new Set();
        favorites.forEach((favorite) => {
            if (favorite.user)
                recipients.add(favorite.user.toString());
        });
        leads.forEach((lead) => {
            if (lead.client)
                recipients.add(lead.client.toString());
        });
        if (recipients.size === 0)
            return;
        const isPause = params.status === 'pause';
        const title = isPause ? 'Projet temporairement en pause' : 'Projet repris';
        const message = isPause
            ? `Le projet "${params.projectTitle}" a ete mis en pause.`
            : `Le projet "${params.projectTitle}" a repris (${params.resumedStatus || 'en construction'}).`;
        await Promise.allSettled(Array.from(recipients).map((recipient) => NotificationService_1.NotificationService.create({
            recipient,
            type: 'project',
            title,
            message,
            relatedProject: params.projectId,
            actionUrl: `/projects/${params.projectId}`,
            actionLabel: 'Voir le projet',
            priority: 'high',
            channels: { inApp: true, email: true },
            data: {
                event: isPause ? 'project-paused' : 'project-resumed',
                status: params.resumedStatus || 'pause',
            },
        })));
    }
    static normalizeMediaItems(items) {
        return (items || []).map(item => typeof item === 'string' ? { url: item } : item);
    }
    static uniqueByUrl(items) {
        const seen = new Set();
        return items.filter((item) => {
            if (!item.url || seen.has(item.url))
                return false;
            seen.add(item.url);
            return true;
        });
    }
    static resolveMediaKey(mediaType) {
        if (mediaType === 'floor-plans' || mediaType === 'floorPlans')
            return 'floorPlans';
        if (mediaType === 'renderings')
            return 'renderings';
        if (mediaType === 'photos')
            return 'photos';
        if (mediaType === 'videos')
            return 'videos';
        return null;
    }
    static validateMediaItem(item, config) {
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
    static async canManageProjectTeam(userId, promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return false;
        if (promoteur.user.toString() === userId)
            return true;
        const teamMember = promoteur.teamMembers.find(m => m.userId.toString() === userId);
        return teamMember?.role === 'admin';
    }
    /**
     * Check if user can access (read/write) a project
     * Owner can always access, team members can access if they belong to the promoteur
     */
    static async canAccessProject(userId, projectId) {
        const user = await User_1.default.findById(userId);
        if (!user?.promoteurProfile)
            return false;
        const project = await Project_1.default.findById(projectId);
        if (!project)
            return false;
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
    static async canModifyProject(userId, projectId) {
        const user = await User_1.default.findById(userId);
        if (!user?.promoteurProfile)
            return false;
        const project = await Project_1.default.findById(projectId);
        if (!project)
            return false;
        // Check if project belongs to the user's promoteur organization
        if (project.promoteur.toString() !== user.promoteurProfile.toString()) {
            return false;
        }
        // Get the promoteur to check if user is a team member
        const promoteur = await Promoteur_1.default.findById(project.promoteur);
        if (!promoteur)
            return false;
        // Owner can always modify
        if (promoteur.user.toString() === userId)
            return true;
        // Team members with admin role can modify
        const teamMember = promoteur.teamMembers.find(m => m.userId.toString() === userId);
        return teamMember?.role === 'admin';
    }
    /**
     * Create a new project
     */
    static async createProject(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(403).json({ message: 'Only promoteurs can create projects' });
            }
            // Check plan limits
            const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
            const canCreate = await PlanLimitService.checkProjectLimit(user.promoteurProfile.toString());
            if (!canCreate) {
                return res.status(403).json({
                    message: 'Limite de projets atteinte pour votre plan',
                    upgrade: true
                });
            }
            const { title, description, projectType, typeDetails, country, city, area, address, coordinates, typologies, priceFrom, currency, timeline, features, amenities, } = req.body;
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
            const project = new Project_1.default({
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
            await Promoteur_1.default.findByIdAndUpdate(user.promoteurProfile, {
                $inc: { totalProjects: 1, activeProjects: 1 },
            });
            // Update onboarding
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (promoteur) {
                const projectChecklistItem = promoteur.onboardingChecklist.find(item => item.code === 'first_project' || item.item.includes('premier projet'));
                if (projectChecklistItem && !projectChecklistItem.completed) {
                    projectChecklistItem.completed = true;
                    projectChecklistItem.completedAt = new Date();
                    OnboardingService_1.OnboardingService.recalculate(promoteur);
                    await promoteur.save();
                    // Check for badges
                    await BadgeService_1.BadgeService.checkAndAwardBadges(user.promoteurProfile.toString());
                }
            }
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'create_project', 'project', `Created project: ${title}`, 'Project', project._id.toString());
            res.status(201).json({ project });
        }
        catch (error) {
            console.error('Error creating project:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Add media to a project by type
     */
    static async addProjectMedia(req, res) {
        try {
            const { id, mediaType } = req.params;
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(403).json({ message: 'Only promoteurs can manage project media' });
            }
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            const canModify = await ProjectController.canModifyProject(req.user.id, id);
            if (!canModify) {
                return res.status(403).json({ message: 'Not authorized to modify this project' });
            }
            const mediaKey = ProjectController.resolveMediaKey(mediaType);
            if (!mediaKey) {
                return res.status(400).json({ message: 'Invalid media type' });
            }
            const config = ProjectController.mediaConfig[mediaKey];
            // Handle file upload via multer
            const uploadedFile = req.file;
            let items = [];
            if (uploadedFile && uploadedFile.buffer) {
                // Validate file
                const mime = uploadedFile.mimetype || 'application/octet-stream';
                const size = uploadedFile.size || 0;
                const mimeError = config.mimeTypes.includes(mime) ? null : 'Unsupported media format';
                if (mimeError) {
                    return res.status(400).json({ message: mimeError });
                }
                if (size > config.maxSize) {
                    return res.status(400).json({ message: 'File too large' });
                }
                // Upload to Cloudinary
                try {
                    const { CloudinaryService } = await Promise.resolve().then(() => __importStar(require('../services/CloudinaryService')));
                    const folder = `projects/${project._id}/${mediaKey}`;
                    const publicId = `${mediaKey}_${Date.now()}`;
                    const resourceType = mediaKey === 'videos' ? 'auto' : 'image';
                    const result = await CloudinaryService.uploadBuffer(uploadedFile.buffer, { folder, publicId, resourceType });
                    const finalUrl = result.secure_url || result.url;
                    items = [{
                            url: finalUrl,
                            mimeType: mime,
                            sizeBytes: size
                        }];
                }
                catch (err) {
                    console.error('Cloudinary upload failed:', err?.message || err);
                    return res.status(500).json({ message: 'Media upload failed', error: err?.message });
                }
            }
            else if (req.body.items && Array.isArray(req.body.items)) {
                // Fallback: handle items from body
                items = req.body.items;
            }
            else if (req.body.url) {
                // Fallback: handle single URL from body
                items = [{ url: req.body.url, mimeType: req.body.mimeType, sizeBytes: req.body.sizeBytes }];
            }
            else {
                return res.status(400).json({ message: 'No file or media URL provided' });
            }
            if (items.length === 0) {
                return res.status(400).json({ message: 'No media items provided' });
            }
            const invalid = items.find(item => ProjectController.validateMediaItem(item, config));
            if (invalid) {
                const error = ProjectController.validateMediaItem(invalid, config);
                return res.status(400).json({ message: error });
            }
            // Add to project media
            const normalizedExisting = ProjectController.normalizeMediaItems(project.media[mediaKey] || []);
            const existingUrls = new Set(normalizedExisting.map(item => item.url));
            const normalizedNew = ProjectController.uniqueByUrl(items.map(item => ({
                url: item.url,
                mimeType: item.mimeType,
                sizeBytes: item.sizeBytes,
                uploadedAt: new Date(),
            })));
            const filtered = normalizedNew.filter(item => !existingUrls.has(item.url));
            const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
            const mediaLimit = await PlanLimitService.checkProjectMediaLimit(user.promoteurProfile.toString(), project._id.toString(), mediaKey, filtered.length);
            if (!mediaLimit.allowed) {
                return res.status(403).json({
                    message: 'Limite media atteinte pour votre plan',
                    details: {
                        mediaType: mediaKey,
                        limit: mediaLimit.limit,
                        current: mediaLimit.current,
                        requested: filtered.length,
                    },
                    upgrade: true,
                });
            }
            project.media[mediaKey] = ProjectController.uniqueByUrl([...normalizedExisting, ...filtered]);
            await project.save();
            const trustScore = await TrustScoreService_1.TrustScoreService.calculateProjectTrustScore(project._id.toString());
            project.trustScore = trustScore;
            await project.save();
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'add_project_media', 'project', `Added ${filtered.length} ${mediaKey} item(s)`, 'Project', project._id.toString(), { mediaKey, count: filtered.length });
            res.json({ project });
        }
        catch (error) {
            console.error('Error adding project media:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get assigned team members for a project
     */
    static async getAssignedTeam(req, res) {
        try {
            const { id } = req.params;
            const project = await Project_1.default.findById(id).populate('assignedTeam.userId', 'firstName lastName email');
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Public projects can expose assigned team; otherwise require ownership
            if (project.publicationStatus !== 'published') {
                const canAccess = await ProjectController.canAccessProject(req.user?.id || '', project._id.toString());
                if (!canAccess) {
                    return res.status(403).json({ message: 'Not authorized to view project details' });
                }
            }
            res.json({ assignedTeam: project.assignedTeam });
        }
        catch (error) {
            console.error('Error getting assigned team:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Assign a team member to a project
     */
    static async assignTeamMember(req, res) {
        try {
            const { id } = req.params;
            const { userId, role } = req.body;
            const user = await User_1.default.findById(req.user.id);
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            if (!user?.promoteurProfile || project.promoteur.toString() !== user.promoteurProfile.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            const canManage = await ProjectController.canManageProjectTeam(req.user.id, project.promoteur.toString());
            if (!canManage) {
                return res.status(403).json({ message: 'Insufficient permissions' });
            }
            if (!['commercial', 'technique'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }
            const promoteur = await Promoteur_1.default.findById(project.promoteur);
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
            }
            else {
                project.assignedTeam.push({ userId, role });
            }
            await project.save();
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'assign_project_team_member', 'project', `Assigned team member to project: ${project.title}`, 'Project', project._id.toString(), { userId, role });
            res.json({ project });
        }
        catch (error) {
            console.error('Error assigning team member:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Remove a team member from a project
     */
    static async removeTeamMember(req, res) {
        try {
            const { id } = req.params;
            const { userId } = req.body;
            const user = await User_1.default.findById(req.user.id);
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            if (!user?.promoteurProfile || project.promoteur.toString() !== user.promoteurProfile.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            const canManage = await ProjectController.canManageProjectTeam(req.user.id, project.promoteur.toString());
            if (!canManage) {
                return res.status(403).json({ message: 'Insufficient permissions' });
            }
            const before = project.assignedTeam.length;
            project.assignedTeam = project.assignedTeam.filter(m => m.userId.toString() !== userId);
            if (project.assignedTeam.length === before) {
                return res.status(404).json({ message: 'Team member not assigned' });
            }
            await project.save();
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'remove_project_team_member', 'project', `Removed team member from project: ${project.title}`, 'Project', project._id.toString(), { userId });
            res.json({ project });
        }
        catch (error) {
            console.error('Error removing team member:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Set project cover image
     */
    static async setProjectCoverImage(req, res) {
        try {
            const { id } = req.params;
            const { url: bodyUrl, mimeType: bodyMime, sizeBytes: bodySize } = req.body;
            const user = await User_1.default.findById(req.user.id);
            console.debug(`[ProjectController.setProjectCoverImage] incoming request for project ${id} bodyUrl=${bodyUrl}`, { hasFile: !!req.file });
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            const canModify = await ProjectController.canModifyProject(req.user.id, id);
            if (!canModify) {
                return res.status(403).json({ message: 'Not authorized to modify this project' });
            }
            // If a file was uploaded via multipart/form-data, upload to Cloudinary
            const uploadedFile = req.file;
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
                    const { CloudinaryService } = await Promise.resolve().then(() => __importStar(require('../services/CloudinaryService')));
                    const folder = `projects/${project._id}/cover`;
                    const publicId = `cover_${Date.now()}`;
                    const result = await CloudinaryService.uploadBuffer(uploadedFile.buffer, { folder, publicId, resourceType: 'image' });
                    const finalUrl = result.secure_url || result.url;
                    project.media.coverImage = finalUrl;
                    await project.save();
                    const trustScore = await TrustScoreService_1.TrustScoreService.calculateProjectTrustScore(project._id.toString());
                    project.trustScore = trustScore;
                    await project.save();
                    await AuditLogService_1.AuditLogService.logFromRequest(req, 'set_project_cover', 'project', 'Uploaded and set project cover image via Cloudinary', 'Project', project._id.toString(), { publicId, folder });
                    return res.json({ project, uploaded: { publicId, folder, url: finalUrl } });
                }
                catch (err) {
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
                const trustScore = await TrustScoreService_1.TrustScoreService.calculateProjectTrustScore(project._id.toString());
                project.trustScore = trustScore;
                await project.save();
                await AuditLogService_1.AuditLogService.logFromRequest(req, 'set_project_cover', 'project', 'Updated project cover image via provided URL', 'Project', project._id.toString());
                return res.json({ project });
            }
            return res.status(400).json({ message: 'No file or url provided' });
        }
        catch (error) {
            console.error('Error setting project cover:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Remove media from a project by type
     */
    static async removeProjectMedia(req, res) {
        try {
            const { id, mediaType } = req.params;
            const { url } = req.body;
            const user = await User_1.default.findById(req.user.id);
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            const canModify = await ProjectController.canModifyProject(req.user.id, id);
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
            const current = ProjectController.normalizeMediaItems(project.media[mediaKey] || []);
            const next = current.filter(item => item.url !== url);
            project.media[mediaKey] = next;
            await project.save();
            const trustScore = await TrustScoreService_1.TrustScoreService.calculateProjectTrustScore(project._id.toString());
            project.trustScore = trustScore;
            await project.save();
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'remove_project_media', 'project', `Removed ${mediaKey} item`, 'Project', project._id.toString(), { mediaKey });
            res.json({ project });
        }
        catch (error) {
            console.error('Error removing project media:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * List project media with pagination and ordering
     */
    static async getProjectMedia(req, res) {
        try {
            const { id, mediaType } = req.params;
            const { page = 1, limit = 20, sort = 'desc' } = req.query;
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            const mediaKey = ProjectController.resolveMediaKey(mediaType);
            if (!mediaKey) {
                return res.status(400).json({ message: 'Invalid media type' });
            }
            const isPublished = project.publicationStatus === 'published';
            if (!isPublished) {
                const canAccess = await ProjectController.canAccessProject(req.user?.id || '', project._id.toString());
                if (!canAccess) {
                    return res.status(403).json({ message: 'Not authorized to view project media' });
                }
            }
            let items = ProjectController.normalizeMediaItems(project.media[mediaKey] || []);
            items = ProjectController.uniqueByUrl(items);
            const hasDates = items.some(item => item.uploadedAt);
            if (hasDates) {
                items.sort((a, b) => {
                    const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
                    const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
                    return sort === 'asc' ? aTime - bTime : bTime - aTime;
                });
            }
            else if (sort === 'desc') {
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
        }
        catch (error) {
            console.error('Error listing project media:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get all projects (with filters)
     */
    static async getProjects(req, res) {
        try {
            const { country, city, projectType, minPrice, maxPrice, minScore, status, verifiedOnly, search, keyword, // Frontend sends keyword instead of search
            sort = 'ranking', page = 1, limit = 20, } = req.query;
            const query = { publicationStatus: 'published' };
            // Filters
            if (country)
                query.country = country;
            if (city)
                query.city = city;
            if (projectType)
                query.projectType = projectType;
            if (minPrice || maxPrice) {
                query.priceFrom = {};
                if (minPrice)
                    query.priceFrom.$gte = Number(minPrice);
                if (maxPrice)
                    query.priceFrom.$lte = Number(maxPrice);
            }
            if (minScore)
                query.trustScore = { $gte: Number(minScore) };
            if (status)
                query.status = status;
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
            let promoteurIds = [];
            if (verifiedOnly === 'true') {
                const verifiedPromoteurs = await Promoteur_1.default.find({
                    plan: { $in: ['standard', 'premium'] }
                }).select('_id');
                promoteurIds = verifiedPromoteurs.map(p => p._id);
                query.promoteur = { $in: promoteurIds };
            }
            const skip = (Number(page) - 1) * Number(limit);
            const now = new Date();
            const sortParam = String(sort || 'ranking');
            const useRanking = sortParam === 'ranking' || sortParam === '-ranking';
            let projects = [];
            if (useRanking) {
                // Weighted ranking score:
                // 45% trust + 20% recency + 20% boost + 15% engagement.
                // Engagement = 50% favorites + 30% views + 20% leads (log-normalized).
                const daysWindow = 90;
                const lnViewsCap = Math.log(5001);
                const lnFavoritesCap = Math.log(501);
                const lnLeadsCap = Math.log(201);
                projects = await Project_1.default.aggregate([
                    { $match: query },
                    {
                        $addFields: {
                            _lastActivityAt: { $ifNull: ['$updatedAt', '$createdAt'] },
                            _trustNorm: {
                                $min: [1, { $max: [0, { $divide: [{ $ifNull: ['$trustScore', 0] }, 100] }] }],
                            },
                            _daysSinceActivity: {
                                $divide: [{ $subtract: [now, { $ifNull: ['$updatedAt', '$createdAt'] }] }, 1000 * 60 * 60 * 24],
                            },
                            _activeBoosts: {
                                $filter: {
                                    input: { $ifNull: ['$boosts', []] },
                                    as: 'b',
                                    cond: {
                                        $and: [
                                            { $eq: ['$$b.status', 'active'] },
                                            { $lte: ['$$b.startDate', now] },
                                            { $gte: ['$$b.endDate', now] },
                                        ],
                                    },
                                },
                            },
                            _viewsNorm: {
                                $min: [
                                    1,
                                    { $divide: [{ $ln: { $add: [{ $ifNull: ['$views', 0] }, 1] } }, lnViewsCap] },
                                ],
                            },
                            _favoritesNorm: {
                                $min: [
                                    1,
                                    { $divide: [{ $ln: { $add: [{ $ifNull: ['$favorites', 0] }, 1] } }, lnFavoritesCap] },
                                ],
                            },
                            _leadsNorm: {
                                $min: [
                                    1,
                                    { $divide: [{ $ln: { $add: [{ $ifNull: ['$totalLeads', 0] }, 1] } }, lnLeadsCap] },
                                ],
                            },
                        },
                    },
                    {
                        $addFields: {
                            _recencyScore: {
                                $max: [0, { $subtract: [1, { $divide: ['$_daysSinceActivity', daysWindow] }] }],
                            },
                            _boostRaw: {
                                $reduce: {
                                    input: '$_activeBoosts',
                                    initialValue: 0,
                                    in: {
                                        $add: [
                                            '$$value',
                                            {
                                                $switch: {
                                                    branches: [
                                                        { case: { $eq: ['$$this.type', 'enterprise'] }, then: 1.0 },
                                                        { case: { $eq: ['$$this.type', 'premium'] }, then: 0.7 },
                                                        { case: { $eq: ['$$this.type', 'basic'] }, then: 0.45 },
                                                        { case: { $eq: ['$$this.type', 'custom'] }, then: 0.55 },
                                                    ],
                                                    default: 0.3,
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                            _engagementScore: {
                                $add: [
                                    { $multiply: ['$_favoritesNorm', 0.5] },
                                    { $multiply: ['$_viewsNorm', 0.3] },
                                    { $multiply: ['$_leadsNorm', 0.2] },
                                ],
                            },
                        },
                    },
                    {
                        $addFields: {
                            _boostWeight: { $min: [1, '$_boostRaw'] },
                            rankingScore: {
                                $add: [
                                    { $multiply: ['$_trustNorm', 0.45] },
                                    { $multiply: ['$_recencyScore', 0.2] },
                                    { $multiply: ['$_boostWeight', 0.2] },
                                    { $multiply: ['$_engagementScore', 0.15] },
                                ],
                            },
                        },
                    },
                    { $sort: { rankingScore: -1, trustScore: -1, createdAt: -1 } },
                    { $skip: skip },
                    { $limit: Number(limit) },
                    {
                        $lookup: {
                            from: 'promoteurs',
                            localField: 'promoteur',
                            foreignField: '_id',
                            as: 'promoteur',
                        },
                    },
                    { $unwind: { path: '$promoteur', preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            changesLog: 0,
                            moderationNotes: 0,
                            _lastActivityAt: 0,
                            _trustNorm: 0,
                            _daysSinceActivity: 0,
                            _activeBoosts: 0,
                            _viewsNorm: 0,
                            _favoritesNorm: 0,
                            _leadsNorm: 0,
                            _recencyScore: 0,
                            _boostRaw: 0,
                            _engagementScore: 0,
                            _boostWeight: 0,
                        },
                    },
                ]);
            }
            else {
                projects = await Project_1.default.find(query)
                    .sort(sortParam)
                    .limit(Number(limit))
                    .skip(skip)
                    .populate('promoteur', 'organizationName trustScore badges plan logo')
                    .select('-changesLog -moderationNotes');
            }
            const total = await Project_1.default.countDocuments(query);
            res.json({
                projects,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit),
                },
            });
        }
        catch (error) {
            console.error('Error getting projects:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get featured projects
     */
    static async getFeaturedProjects(req, res) {
        try {
            const { page = 1, limit = 20, sort = '-createdAt' } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const now = new Date();
            const query = {
                publicationStatus: 'published',
                isFeatured: true,
                $or: [{ featuredUntil: { $exists: false } }, { featuredUntil: { $gte: now } }],
            };
            const projects = await Project_1.default.find(query)
                .sort(sort)
                .limit(Number(limit))
                .skip(skip)
                .populate('promoteur', 'organizationName trustScore badges plan logo')
                .select('-changesLog -moderationNotes');
            const total = await Project_1.default.countDocuments(query);
            res.json({
                projects,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit),
                },
            });
        }
        catch (error) {
            console.error('Error getting featured projects:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get Top Verified projects
     */
    static async getTopVerifiedProjects(req, res) {
        try {
            const { page = 1, limit = 20, minScore = 85, sort = '-trustScore' } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const promoteurs = await Promoteur_1.default.find({ trustScore: { $gte: Number(minScore) } })
                .select('_id');
            const promoteurIds = promoteurs.map(p => p._id);
            const query = {
                publicationStatus: 'published',
                promoteur: { $in: promoteurIds },
            };
            const projects = await Project_1.default.find(query)
                .sort(sort)
                .limit(Number(limit))
                .skip(skip)
                .populate('promoteur', 'organizationName trustScore badges plan logo')
                .select('-changesLog -moderationNotes');
            const total = await Project_1.default.countDocuments(query);
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
        }
        catch (error) {
            console.error('Error getting top verified projects:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get single project by ID or slug
     */
    static async getProject(req, res) {
        try {
            const { identifier } = req.params;
            // Try to find by ID first, then by slug
            let project = await Project_1.default.findById(identifier);
            if (!project) {
                project = await Project_1.default.findOne({ slug: identifier });
            }
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Increment views
            project.views += 1;
            await project.save();
            // Populate related data - populate complete promoteur info with user details
            await project.populate({
                path: 'promoteur',
                select: '-password -refreshTokens',
                populate: {
                    path: 'user',
                    select: 'firstName lastName email phone avatar'
                }
            });
            // Fetch documents for this project separately
            const documents = await Document_1.default.find({ project: project._id })
                .populate('uploadedBy', 'firstName lastName email');
            // Attach documents to project response
            const projectWithDocs = {
                ...project.toObject(),
                documents
            };
            // Check if user has favorited this project
            let isFavorited = false;
            if (req.user) {
                const favorite = await Favorite_1.default.findOne({
                    user: req.user.id,
                    project: project._id,
                });
                isFavorited = !!favorite;
            }
            res.json({ project: projectWithDocs, isFavorited });
        }
        catch (error) {
            console.error('Error getting project:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update project
     */
    static async updateProject(req, res) {
        try {
            const { id } = req.params;
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(403).json({ message: 'Only promoteurs can update projects' });
            }
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Check authorization  
            const canModify = await ProjectController.canModifyProject(req.user.id, id);
            if (!canModify) {
                return res.status(403).json({ message: 'Not authorized to update this project' });
            }
            // Fields that should NOT be updated (protected fields)
            const protectedFields = [
                '_id',
                'promoteur',
                'publicationStatus',
                'createdAt',
                'updatedAt',
                'changesLog',
                '__v',
            ];
            const updates = {};
            const changesLog = [];
            const criticalChanges = [];
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
                if (!protectedFields.includes(key) && req.body[key] !== undefined) {
                    // Track changes for important fields
                    if (['priceFrom', 'timeline', 'status'].includes(key)) {
                        if (JSON.stringify(project[key]) !== JSON.stringify(req.body[key])) {
                            if (['priceFrom', 'timeline'].includes(key)) {
                                criticalChanges.push(key);
                            }
                            changesLog.push({
                                field: key,
                                oldValue: project[key],
                                newValue: req.body[key],
                                reason: req.body.changeReason || 'Updated by promoteur',
                                changedBy: user._id,
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
                const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
                const { limits } = await PlanLimitService.getLimitsInfo(user.promoteurProfile.toString());
                const currentMedia = project.media || {};
                const nextRenderingsCount = renderings !== undefined
                    ? (Array.isArray(renderings) ? renderings.length : 0)
                    : (Array.isArray(currentMedia.renderings) ? currentMedia.renderings.length : 0);
                const nextPhotosCount = photos !== undefined
                    ? (Array.isArray(photos) ? photos.length : 0)
                    : (Array.isArray(currentMedia.photos) ? currentMedia.photos.length : 0);
                const nextFloorPlansCount = floorPlans !== undefined
                    ? (Array.isArray(floorPlans) ? floorPlans.length : 0)
                    : (Array.isArray(currentMedia.floorPlans) ? currentMedia.floorPlans.length : 0);
                const nextVideosCount = videos !== undefined
                    ? (Array.isArray(videos) ? videos.length : 0)
                    : (Array.isArray(currentMedia.videos) ? currentMedia.videos.length : 0);
                const nextMediaCount = nextRenderingsCount + nextPhotosCount + nextFloorPlansCount;
                if (limits.maxMediaPerProject !== -1 && nextMediaCount > limits.maxMediaPerProject) {
                    return res.status(403).json({
                        message: 'Limite media atteinte pour votre plan',
                        details: {
                            limit: limits.maxMediaPerProject,
                            requested: nextMediaCount,
                        },
                        upgrade: true,
                    });
                }
                if (limits.maxVideos !== -1 && nextVideosCount > limits.maxVideos) {
                    return res.status(403).json({
                        message: 'Limite de videos atteinte pour votre plan',
                        details: {
                            limit: limits.maxVideos,
                            requested: nextVideosCount,
                        },
                        upgrade: true,
                    });
                }
                if (coverImage !== undefined)
                    updates['media.coverImage'] = coverImage;
                if (renderings !== undefined)
                    updates['media.renderings'] = renderings;
                if (photos !== undefined)
                    updates['media.photos'] = photos;
                if (videos !== undefined)
                    updates['media.videos'] = videos;
                if (floorPlans !== undefined)
                    updates['media.floorPlans'] = floorPlans;
            }
            // Apply updates
            Object.assign(project, updates);
            // Add changes to log
            if (changesLog.length > 0) {
                project.changesLog.push(...changesLog);
            }
            await project.save();
            // Recalculate trust score
            const trustScore = await TrustScoreService_1.TrustScoreService.calculateProjectTrustScore(project._id.toString());
            project.trustScore = trustScore;
            await project.save();
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'update_project', 'project', `Updated project: ${project.title}`, 'Project', project._id.toString(), { changes: changesLog.length });
            if (criticalChanges.length > 0) {
                const alertOnPrice = criticalChanges.includes('priceFrom');
                const alertOnStatus = criticalChanges.includes('timeline') || criticalChanges.includes('status');
                const favoriteQuery = { project: project._id };
                if (alertOnPrice && alertOnStatus) {
                    favoriteQuery.$or = [{ alertOnPriceChange: true }, { alertOnStatusChange: true }];
                }
                else if (alertOnPrice) {
                    favoriteQuery.alertOnPriceChange = true;
                }
                else if (alertOnStatus) {
                    favoriteQuery.alertOnStatusChange = true;
                }
                const favorites = await Favorite_1.default.find(favoriteQuery).select('user');
                const followerIds = favorites.map(f => f.user.toString());
                if (followerIds.length > 0) {
                    await Promise.all(followerIds.map(userId => NotificationService_1.NotificationService.create({
                        recipient: userId,
                        type: 'project',
                        title: 'Changement important sur un projet',
                        message: `Le projet "${project.title}" a ete mis a jour. Raison: ${req.body.changeReason}`,
                        relatedProject: project._id.toString(),
                        priority: 'medium',
                        channels: { inApp: true, email: true },
                    })));
                }
            }
            res.json({ project });
        }
        catch (error) {
            console.error('Error updating project:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get project changes log
     */
    static async getChangesLog(req, res) {
        try {
            const { id } = req.params;
            const user = await User_1.default.findById(req.user.id);
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            const isOwner = project.promoteur.toString() === user?.promoteurProfile?.toString();
            const isFollower = await Favorite_1.default.findOne({ user: req.user.id, project: project._id });
            if (!isOwner && !isFollower) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            const changesLog = [...project.changesLog].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
            res.json({ changesLog });
        }
        catch (error) {
            console.error('Error getting changes log:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Delete/Archive project
     */
    static async deleteProject(req, res) {
        try {
            const { id } = req.params;
            const user = await User_1.default.findById(req.user.id);
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Check authorization
            const canModify = await ProjectController.canModifyProject(req.user.id, id);
            if (!canModify) {
                return res.status(403).json({ message: 'Not authorized to delete this project' });
            }
            // Archive instead of delete (mark as unpublished)
            project.publicationStatus = 'draft';
            await project.save();
            // Update promoteur stats
            if (user?.promoteurProfile) {
                await Promoteur_1.default.findByIdAndUpdate(user.promoteurProfile, {
                    $inc: { activeProjects: -1 },
                });
            }
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'archive_project', 'project', `Archived project: ${project.title}`, 'Project', project._id.toString());
            res.json({ message: 'Project archived successfully' });
        }
        catch (error) {
            console.error('Error deleting project:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Submit project for publication
     */
    static async submitForPublication(req, res) {
        try {
            const { id } = req.params;
            const user = await User_1.default.findById(req.user.id);
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            console.log(`[submitForPublication] Project "${project.title}" (${id}) validation:`, {
                hasCoverImage: !!project.media?.coverImage,
                coverImageValue: project.media?.coverImage,
                typologiesCount: project.typologies?.length || 0,
                typologiesValue: project.typologies
            });
            // Check authorization
            const canModify = await ProjectController.canModifyProject(req.user.id, id);
            if (!canModify) {
                return res.status(403).json({ message: 'Not authorized to publish this project' });
            }
            // Check if project has minimum required info
            const missingElements = [];
            // Vérifier la couverture image
            if (!project.media || !project.media.coverImage) {
                missingElements.push('cover image');
            }
            // Vérifier les typologies
            if (!project.typologies || !Array.isArray(project.typologies) || project.typologies.length === 0) {
                missingElements.push('at least one typology');
            }
            if (missingElements.length > 0) {
                console.warn(`[submitForPublication] Publication rejected for "${project.title}": missing ${missingElements.join(', ')}`);
                return res.status(400).json({
                    message: `Cannot publish: missing ${missingElements.join(' and ')}`,
                    details: {
                        coverImage: !!project.media?.coverImage,
                        typologies: project.typologies?.length || 0
                    }
                });
            }
            project.publicationStatus = 'pending';
            await project.save();
            console.log(`[submitForPublication] Project "${project.title}" successfully submitted for publication`);
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'submit_project_for_publication', 'project', `Submitted project for publication: ${project.title}`, 'Project', project._id.toString());
            res.json({ project });
        }
        catch (error) {
            console.error('Error submitting project:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get promoteur's own projects
     */
    static async getMyProjects(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(403).json({ message: 'Only promoteurs can access this' });
            }
            const { status, page = 1, limit = 20 } = req.query;
            const query = { promoteur: user.promoteurProfile };
            if (status)
                query.status = status;
            const skip = (Number(page) - 1) * Number(limit);
            const projects = await Project_1.default.find(query)
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip(skip);
            const total = await Project_1.default.countDocuments(query);
            res.json({
                projects,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit),
                },
            });
        }
        catch (error) {
            console.error('Error getting my projects:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Add FAQ to project
     */
    static async addFAQ(req, res) {
        try {
            const { id } = req.params;
            const { question, answer } = req.body;
            const user = await User_1.default.findById(req.user.id);
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Check authorization
            const canModify = await ProjectController.canModifyProject(req.user.id, id);
            if (!canModify) {
                return res.status(403).json({ message: 'Not authorized to modify this project' });
            }
            project.faq.push({
                question,
                answer,
                addedAt: new Date(),
            });
            await project.save();
            res.json({ project });
        }
        catch (error) {
            console.error('Error adding FAQ:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Report delay
     */
    static async reportDelay(req, res) {
        try {
            const { id } = req.params;
            const { reason, originalDate, newDate, mitigationPlan } = req.body;
            const user = await User_1.default.findById(req.user.id);
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Check authorization
            const canModify = await ProjectController.canModifyProject(req.user.id, id);
            if (!canModify) {
                return res.status(403).json({ message: 'Not authorized to report delays' });
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
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'report_delay', 'project', `Reported delay for project: ${project.title}`, 'Project', project._id.toString());
            res.json({ project });
        }
        catch (error) {
            console.error('Error reporting delay:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Report risk
     */
    static async reportRisk(req, res) {
        try {
            const { id } = req.params;
            const { type, description, severity, mitigationPlan } = req.body;
            const user = await User_1.default.findById(req.user.id);
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Check authorization
            const canModify = await ProjectController.canModifyProject(req.user.id, id);
            if (!canModify) {
                return res.status(403).json({ message: 'Not authorized to report risks' });
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
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'report_risk', 'project', `Reported ${severity} risk for project: ${project.title}`, 'Project', project._id.toString());
            res.json({ project });
        }
        catch (error) {
            console.error('Error reporting risk:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Pause project
     */
    static async pauseProject(req, res) {
        try {
            const { id } = req.params;
            const { reason, description, estimatedResumeDate, supportingDocuments } = req.body;
            const user = await User_1.default.findById(req.user.id);
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Check authorization
            const canModify = await ProjectController.canModifyProject(req.user.id, id);
            if (!canModify) {
                return res.status(403).json({ message: 'Not authorized to pause this project' });
            }
            // Cannot pause if already paused or completed
            if (project.pauseInfo) {
                return res.status(400).json({ message: 'Project is already paused' });
            }
            if (project.status === 'livraison') {
                return res.status(400).json({ message: 'Cannot pause completed projects' });
            }
            const oldStatus = project.status;
            project.pauseInfo = {
                reason,
                description,
                pausedAt: new Date(),
                estimatedResumeDate: estimatedResumeDate ? new Date(estimatedResumeDate) : undefined,
                supportingDocuments,
                statusBeforePause: oldStatus
            };
            // Add to change log
            project.changesLog.push({
                field: 'pause',
                oldValue: 'active',
                newValue: 'paused',
                reason: `Project paused: ${description}`,
                changedBy: req.user.id,
                changedAt: new Date()
            });
            await project.save();
            await ProjectController.notifyProjectCriticalStatusChange({
                projectId: project._id.toString(),
                projectTitle: project.title,
                status: 'pause',
            });
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'pause_project', 'project', `Paused project: ${project.title}`, 'Project', project._id.toString());
            res.json({ project });
        }
        catch (error) {
            console.error('Error pausing project:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Resume project
     */
    static async resumeProject(req, res) {
        try {
            const { id } = req.params;
            const { newStatus } = req.body;
            const user = await User_1.default.findById(req.user.id);
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Check authorization
            const canModify = await ProjectController.canModifyProject(req.user.id, id);
            if (!canModify) {
                return res.status(403).json({ message: 'Not authorized to resume this project' });
            }
            if (!project.pauseInfo) {
                return res.status(400).json({ message: 'Project is not paused' });
            }
            const allowedResumeStatuses = new Set([
                'permis-de-construire',
                'pre-commercialisation',
                'demarrage-chantier',
                'fondations',
                'gros-oeuvres',
                'second-oeuvres',
                'livraison',
            ]);
            if (!newStatus || !allowedResumeStatuses.has(newStatus)) {
                return res.status(400).json({ message: 'Invalid newStatus value' });
            }
            const statusBeforePause = project.pauseInfo.statusBeforePause || project.status;
            project.status = newStatus;
            const pauseInfo = project.pauseInfo; // Keep for logging
            project.pauseInfo = undefined; // Clear pause info
            // Add to change log
            project.changesLog.push({
                field: 'pause',
                oldValue: 'paused',
                newValue: 'active',
                reason: 'Project resumed',
                changedBy: req.user.id,
                changedAt: new Date()
            });
            await project.save();
            await ProjectController.notifyProjectCriticalStatusChange({
                projectId: project._id.toString(),
                projectTitle: project.title,
                status: 'resume',
                resumedStatus: newStatus,
            });
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'resume_project', 'project', `Resumed project: ${project.title}`, 'Project', project._id.toString());
            res.json({ project });
        }
        catch (error) {
            console.error('Error resuming project:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get project pause history
     */
    static async getPauseHistory(req, res) {
        try {
            const { id } = req.params;
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Only show for published projects or owners
            const user = await User_1.default.findById(req.user.id);
            const isOwner = project.promoteur.toString() === user?.promoteurProfile?.toString();
            if (project.publicationStatus !== 'published' && !isOwner) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            const pauseHistory = project.changesLog
                .filter(change => change.field === 'status' && (change.oldValue === 'pause' || change.newValue === 'pause'))
                .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
            res.json({ history: pauseHistory });
        }
        catch (error) {
            console.error('Error getting pause history:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.ProjectController = ProjectController;
ProjectController.mediaConfig = {
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
