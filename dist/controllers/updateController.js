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
exports.UpdateController = void 0;
const Update_1 = __importDefault(require("../models/Update"));
const Project_1 = __importDefault(require("../models/Project"));
const User_1 = __importDefault(require("../models/User"));
const AuditLogService_1 = require("../services/AuditLogService");
const UpdatePublishService_1 = require("../services/UpdatePublishService");
class UpdateController {
    /**
     * Create project update
     */
    static async createUpdate(req, res) {
        console.log('[UpdateController.createUpdate] POST /api/updates received');
        console.log('Headers:', req.headers);
        console.log('User:', req.user);
        console.log('Body:', req.body);
        try {
            const { projectId, title, description, photos, whatsDone, nextStep, nextMilestoneDate, risksIdentified, projectStatus, progressDescription, expectedDeliveryDate, milestone, scheduledFor, } = req.body;
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(403).json({ message: 'Only promoteurs can create updates' });
            }
            const project = await Project_1.default.findById(projectId);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Check ownership
            if (project.promoteur.toString() !== user.promoteurProfile.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
            const updateLimit = await PlanLimitService.checkMonthlyUpdateLimit(user.promoteurProfile.toString(), 1);
            if (!updateLimit.allowed) {
                return res.status(403).json({
                    message: 'Limite mensuelle de mises a jour atteinte pour votre plan',
                    details: {
                        limit: updateLimit.limit,
                        current: updateLimit.current,
                        requested: 1,
                    },
                    upgrade: true,
                });
            }
            // Validate photos (must be exactly 3)
            if (!photos || photos.length !== 3) {
                return res.status(400).json({
                    message: 'Exactly 3 photos are required for each update'
                });
            }
            if (!whatsDone || !nextStep || !risksIdentified || !nextMilestoneDate) {
                return res.status(400).json({ message: 'whatsDone, nextStep, risksIdentified and nextMilestoneDate are required' });
            }
            const allowedProjectStatuses = new Set([
                'pre-commercialisation',
                'en-construction',
                'gros-oeuvre',
                'livre',
                'pause',
                'archive',
                'suspended',
            ]);
            if (projectStatus && !allowedProjectStatuses.has(projectStatus)) {
                return res.status(400).json({ message: 'Invalid projectStatus value' });
            }
            let parsedExpectedDeliveryDate;
            if (expectedDeliveryDate) {
                parsedExpectedDeliveryDate = new Date(expectedDeliveryDate);
                if (Number.isNaN(parsedExpectedDeliveryDate.getTime())) {
                    return res.status(400).json({ message: 'expectedDeliveryDate must be a valid date' });
                }
            }
            if (scheduledFor) {
                const scheduledDate = new Date(scheduledFor);
                if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
                    return res.status(400).json({ message: 'scheduledFor must be a future date' });
                }
            }
            // Force promoteur à user.promoteurProfile (ObjectId)
            const promoteurId = user.promoteurProfile;
            const update = new Update_1.default({
                project: projectId,
                promoteur: promoteurId,
                title,
                description,
                photos,
                whatsDone,
                nextStep,
                nextMilestoneDate: new Date(nextMilestoneDate),
                risksIdentified,
                projectStatus,
                progressDescription: typeof progressDescription === 'string' ? progressDescription.trim() : undefined,
                expectedDeliveryDate: parsedExpectedDeliveryDate,
                milestone,
                status: scheduledFor ? 'scheduled' : 'draft',
                scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
                views: 0,
            });
            console.log('[UpdateController.createUpdate] promoteur:', user.promoteurProfile?.toString(), '| status:', update.status, '| scheduledFor:', update.scheduledFor);
            await update.save();
            console.log('[UpdateController.createUpdate] update saved:', update._id, '| status:', update.status, '| scheduledFor:', update.scheduledFor);
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'create_update', 'project', `Created update for project: ${project.title}`, 'Update', update._id.toString());
            res.status(201).json({ update });
        }
        catch (error) {
            console.error('Error creating update:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Publish update
     */
    static async publishUpdate(req, res) {
        try {
            const { id } = req.params;
            const user = await User_1.default.findById(req.user.id);
            const update = await Update_1.default.findById(id);
            if (!update) {
                return res.status(404).json({ message: 'Update not found' });
            }
            // Check ownership
            if (update.promoteur.toString() !== user?.promoteurProfile?.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            await UpdatePublishService_1.UpdatePublishService.publishUpdate(update._id.toString());
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'publish_update', 'project', `Published update for project`, 'Update', id);
            res.json({ update });
        }
        catch (error) {
            console.error('Error publishing update:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get updates for a project
     */
    static async getProjectUpdates(req, res) {
        try {
            const { projectId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const query = { project: projectId, status: 'published' };
            const skip = (Number(page) - 1) * Number(limit);
            const updates = await Update_1.default.find(query)
                .sort({ publishedAt: -1 })
                .limit(Number(limit))
                .skip(skip);
            const total = await Update_1.default.countDocuments(query);
            res.json({
                updates,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit),
                },
            });
        }
        catch (error) {
            console.error('Error getting updates:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get single update
     */
    static async getUpdate(req, res) {
        try {
            const { id } = req.params;
            const update = await Update_1.default.findById(id)
                .populate('project', 'title slug')
                .populate('promoteur', 'organizationName');
            if (!update) {
                return res.status(404).json({ message: 'Update not found' });
            }
            // Increment views
            update.views += 1;
            await update.save();
            res.json({ update });
        }
        catch (error) {
            console.error('Error getting update:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update an update (draft only)
     */
    static async updateUpdate(req, res) {
        try {
            const { id } = req.params;
            const user = await User_1.default.findById(req.user.id);
            const update = await Update_1.default.findById(id);
            if (!update) {
                return res.status(404).json({ message: 'Update not found' });
            }
            // Check ownership
            if (update.promoteur.toString() !== user?.promoteurProfile?.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            // Only drafts can be updated
            if (update.status !== 'draft' && update.status !== 'scheduled') {
                return res.status(400).json({
                    message: 'Only draft or scheduled updates can be modified'
                });
            }
            const allowedFields = [
                'title',
                'description',
                'photos',
                'whatsDone',
                'nextStep',
                'nextMilestoneDate',
                'risksIdentified',
                'projectStatus',
                'progressDescription',
                'expectedDeliveryDate',
                'milestone',
                'scheduledFor',
            ];
            Object.keys(req.body).forEach(key => {
                if (allowedFields.includes(key)) {
                    update[key] = req.body[key];
                }
            });
            if (typeof req.body.progressDescription === 'string') {
                update.progressDescription = req.body.progressDescription.trim();
            }
            if (req.body.photos && req.body.photos.length !== 3) {
                return res.status(400).json({ message: 'Exactly 3 photos are required for each update' });
            }
            if (req.body.projectStatus) {
                const allowedProjectStatuses = new Set([
                    'pre-commercialisation',
                    'en-construction',
                    'gros-oeuvre',
                    'livre',
                    'pause',
                    'archive',
                    'suspended',
                ]);
                if (!allowedProjectStatuses.has(req.body.projectStatus)) {
                    return res.status(400).json({ message: 'Invalid projectStatus value' });
                }
            }
            if (req.body.expectedDeliveryDate) {
                const parsedExpectedDeliveryDate = new Date(req.body.expectedDeliveryDate);
                if (Number.isNaN(parsedExpectedDeliveryDate.getTime())) {
                    return res.status(400).json({ message: 'expectedDeliveryDate must be a valid date' });
                }
                update.expectedDeliveryDate = parsedExpectedDeliveryDate;
            }
            else if (req.body.expectedDeliveryDate === null || req.body.expectedDeliveryDate === '') {
                update.expectedDeliveryDate = undefined;
            }
            if (req.body.scheduledFor) {
                const scheduledDate = new Date(req.body.scheduledFor);
                if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
                    return res.status(400).json({ message: 'scheduledFor must be a future date' });
                }
                update.status = 'scheduled';
                update.scheduledFor = scheduledDate;
            }
            else if (update.status === 'scheduled') {
                update.status = 'draft';
                update.scheduledFor = undefined;
            }
            await update.save();
            res.json({ update });
        }
        catch (error) {
            console.error('Error updating update:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Delete update (draft only)
     */
    static async deleteUpdate(req, res) {
        try {
            const { id } = req.params;
            const user = await User_1.default.findById(req.user.id);
            const update = await Update_1.default.findById(id);
            if (!update) {
                return res.status(404).json({ message: 'Update not found' });
            }
            // Check ownership
            if (update.promoteur.toString() !== user?.promoteurProfile?.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            // Only drafts can be deleted
            if (update.status !== 'draft') {
                return res.status(400).json({
                    message: 'Only draft updates can be deleted'
                });
            }
            await Update_1.default.findByIdAndDelete(id);
            res.json({ message: 'Update deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting update:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get promoteur's updates
     */
    static async getMyUpdates(req, res) {
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
            const updates = await Update_1.default.find(query)
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip(skip)
                .populate('project', 'title slug');
            const total = await Update_1.default.countDocuments(query);
            res.json({
                updates,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit),
                },
            });
        }
        catch (error) {
            console.error('Error getting my updates:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get updates calendar grouped by scheduledFor date
     */
    static async getUpdatesCalendar(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            console.log('[UpdateController.getUpdatesCalendar] user:', user);
            if (!user?.promoteurProfile) {
                console.log('[UpdateController.getUpdatesCalendar] Pas de promoteurProfile sur user:', user?._id);
                return res.status(403).json({ message: 'Only promoteurs can access this' });
            }
            console.log('[UpdateController.getUpdatesCalendar] promoteurProfile user:', user.promoteurProfile, typeof user.promoteurProfile);
            const { from, to } = req.query;
            const query = {
                promoteur: user.promoteurProfile,
                status: 'scheduled',
            };
            if (from || to) {
                query.scheduledFor = {};
                if (from)
                    query.scheduledFor.$gte = new Date(from);
                if (to)
                    query.scheduledFor.$lte = new Date(to);
            }
            const updates = await Update_1.default.find({ status: 'scheduled' })
                .sort({ scheduledFor: 1 })
                .populate('project', 'title slug');
            // Log promoteur de la requête et promoteur de chaque update trouvée
            console.log('[UpdateController.getUpdatesCalendar] promoteur requête:', user.promoteurProfile ?? 'undefined', typeof user.promoteurProfile);
            updates.forEach(update => {
                console.log('[UpdateController.getUpdatesCalendar] update:', update._id.toString(), '| promoteur:', update.promoteur, typeof update.promoteur, '| status:', update.status, '| scheduledFor:', update.scheduledFor);
            });
            // On filtre ensuite comme avant
            const filtered = updates.filter(update => update.promoteur && user.promoteurProfile && update.promoteur.toString() === user.promoteurProfile.toString());
            console.log('[UpdateController.getUpdatesCalendar] updates matching promoteur:', filtered.length);
            const calendar = {};
            filtered.forEach(update => {
                const dateKey = update.scheduledFor
                    ? new Date(update.scheduledFor).toISOString().slice(0, 10)
                    : 'unscheduled';
                if (!calendar[dateKey])
                    calendar[dateKey] = [];
                calendar[dateKey].push(update);
            });
            res.json({ calendar });
        }
        catch (error) {
            console.error('Error getting updates calendar:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.UpdateController = UpdateController;
