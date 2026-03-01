"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectBrochureController = void 0;
const ProjectBrochure_1 = __importDefault(require("../models/ProjectBrochure"));
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const AuditLogService_1 = require("../services/AuditLogService");
class ProjectBrochureController {
    /**
     * Upload brochure for a project
     */
    static async uploadBrochure(req, res) {
        try {
            const { projectId } = req.params;
            const { title, description } = req.body;
            const file = req.file;
            console.log('[uploadBrochure] Request received:', {
                projectId,
                file: file ? { name: file.originalname, size: file.size, mimetype: file.mimetype } : null,
                body: { title, description },
                user: req.user?.id,
            });
            if (!file) {
                return res.status(400).json({ message: 'File is required' });
            }
            // Verify project exists
            const project = await Project_1.default.findById(projectId);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Verify user has permission (owner or team member)
            let promoteurId;
            if (req.user.promoteurProfile) {
                promoteurId = req.user.promoteurProfile;
            }
            else {
                const promoteur = await Promoteur_1.default.findOne({ user: req.user.id }).select('_id');
                if (!promoteur) {
                    return res.status(403).json({ message: 'Not authorized' });
                }
                promoteurId = promoteur._id.toString();
            }
            // Verify project belongs to this promoteur
            if (project.promoteur.toString() !== promoteurId) {
                return res.status(403).json({ message: 'Not authorized to upload for this project' });
            }
            // Check if brochure already exists
            let brochure = await ProjectBrochure_1.default.findOne({
                project: projectId,
                promoteur: promoteurId,
            });
            // File URL - in production, this would be S3 or similar
            // For now, we'll use a placeholder format
            const fileUrl = `/storage/brochures/${projectId}/${file.filename || file.originalname}`;
            if (brochure) {
                // Update existing brochure
                brochure.fileName = file.originalname || 'brochure';
                brochure.fileSize = file.size;
                brochure.fileType = file.mimetype;
                brochure.fileUrl = fileUrl;
                brochure.title = title || brochure.title;
                brochure.description = description || brochure.description;
                brochure.lastUpdatedAt = new Date();
                await brochure.save();
                await AuditLogService_1.AuditLogService.log({
                    action: 'update_project_brochure',
                    category: 'document',
                    targetType: 'ProjectBrochure',
                    targetId: brochure._id.toString(),
                    actor: req.user.id,
                    description: `Updated brochure for project ${project.title}`,
                });
            }
            else {
                // Create new brochure
                brochure = await ProjectBrochure_1.default.create({
                    project: projectId,
                    promoteur: promoteurId,
                    fileName: file.originalname || 'brochure',
                    fileSize: file.size,
                    fileType: file.mimetype,
                    fileUrl,
                    title: title || 'Project Brochure',
                    description: description,
                    uploadedBy: req.user.id,
                });
                await AuditLogService_1.AuditLogService.log({
                    action: 'create_project_brochure',
                    category: 'document',
                    targetType: 'ProjectBrochure',
                    targetId: brochure._id.toString(),
                    actor: req.user.id,
                    description: `Uploaded brochure for project ${project.title}`,
                });
            }
            res.json({
                success: true,
                brochure: {
                    _id: brochure._id,
                    fileName: brochure.fileName,
                    fileSize: brochure.fileSize,
                    fileType: brochure.fileType,
                    fileUrl: brochure.fileUrl,
                    title: brochure.title,
                    description: brochure.description,
                    uploadedAt: brochure.uploadedAt,
                },
            });
        }
        catch (error) {
            console.error('Error uploading brochure:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get project brochure
     */
    static async getProjectBrochure(req, res) {
        try {
            const { projectId } = req.params;
            const brochure = await ProjectBrochure_1.default.findOne({ project: projectId });
            if (!brochure) {
                return res.status(404).json({ message: 'Brochure not found' });
            }
            res.json({ brochure });
        }
        catch (error) {
            console.error('Error getting brochure:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Delete project brochure
     */
    static async deleteBrochure(req, res) {
        try {
            const { projectId } = req.params;
            const brochure = await ProjectBrochure_1.default.findOne({ project: projectId });
            if (!brochure) {
                return res.status(404).json({ message: 'Brochure not found' });
            }
            // Verify authorization
            let promoteurId;
            if (req.user.promoteurProfile) {
                promoteurId = req.user.promoteurProfile;
            }
            else {
                const promoteur = await Promoteur_1.default.findOne({ user: req.user.id });
                if (!promoteur) {
                    return res.status(403).json({ message: 'Not authorized' });
                }
                promoteurId = promoteur._id.toString();
            }
            if (brochure.promoteur.toString() !== promoteurId) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            await ProjectBrochure_1.default.deleteOne({ _id: brochure._id });
            await AuditLogService_1.AuditLogService.log({
                action: 'delete_project_brochure',
                category: 'document',
                targetType: 'ProjectBrochure',
                targetId: brochure._id.toString(),
                actor: req.user.id,
                description: `Deleted brochure for project ${projectId}`,
            });
            res.json({ success: true, message: 'Brochure deleted' });
        }
        catch (error) {
            console.error('Error deleting brochure:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Track brochure download and increment counter
     */
    static async trackDownload(req, res) {
        try {
            const { projectId } = req.params;
            const brochure = await ProjectBrochure_1.default.findOne({ project: projectId });
            if (!brochure) {
                return res.status(404).json({ message: 'Brochure not found' });
            }
            brochure.totalDownloads = (brochure.totalDownloads || 0) + 1;
            brochure.lastDownloadedAt = new Date();
            await brochure.save();
            res.json({ success: true, brochure });
        }
        catch (error) {
            console.error('Error tracking download:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Download project brochure
     */
    static async downloadBrochure(req, res) {
        try {
            const { brochureId } = req.params;
            const brochure = await ProjectBrochure_1.default.findById(brochureId);
            if (!brochure) {
                return res.status(404).json({ message: 'Brochure not found' });
            }
            // Increment download counter
            brochure.totalDownloads = (brochure.totalDownloads || 0) + 1;
            brochure.lastDownloadedAt = new Date();
            await brochure.save();
            // For now, redirect to the file URL
            // In production, this should serve the file directly from storage
            res.json({
                success: true,
                brochure: {
                    _id: brochure._id,
                    fileName: brochure.fileName,
                    fileUrl: brochure.fileUrl,
                    title: brochure.title,
                    description: brochure.description,
                },
            });
        }
        catch (error) {
            console.error('Error downloading brochure:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.ProjectBrochureController = ProjectBrochureController;
