"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseController = void 0;
const Case_1 = __importDefault(require("../models/Case"));
const AuditLogService_1 = require("../services/AuditLogService");
const NotificationService_1 = require("../services/NotificationService");
class CaseController {
    /**
     * Create a new case
     */
    static async create(req, res) {
        try {
            const userId = req.user.id;
            const userRoles = req.user.roles;
            const reporterType = userRoles.includes('promoteur') ? 'promoteur' :
                userRoles.includes('admin') ? 'admin' : 'client';
            // Calculate SLA deadline based on priority
            const priorityHours = { low: 72, medium: 48, high: 24, urgent: 12 };
            const hours = priorityHours[req.body.priority || 'medium'];
            const slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);
            const caseData = new Case_1.default({
                ...req.body,
                reporter: userId,
                reporterType,
                slaDeadline,
                reportedAt: new Date(),
            });
            await caseData.save();
            // Notify admins
            await NotificationService_1.NotificationService.createAdminNotification({
                type: 'warning',
                title: 'Nouveau cas signalé',
                message: `${caseData.title} - ${caseData.category}`,
                priority: caseData.priority === 'urgent' ? 'urgent' : 'high',
                link: `/admin/cases/${caseData._id}`,
            });
            res.status(201).json({
                success: true,
                data: caseData,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Admin: statistics overview for cases (used by admin dashboard)
     */
    static async getStatsOverview(req, res) {
        try {
            const total = await Case_1.default.countDocuments();
            const open = await Case_1.default.countDocuments({ status: { $nin: ['resolu', 'ferme'] } });
            const critical = await Case_1.default.countDocuments({ priority: { $in: ['high', 'urgent'] } });
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const resolvedThisMonth = await Case_1.default.countDocuments({ resolvedAt: { $gte: startOfMonth } });
            res.json({
                success: true,
                data: { total, open, critical, resolvedThisMonth },
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * Get case by ID
     */
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const caseData = await Case_1.default.findById(id)
                .populate('reporter', 'firstName lastName email')
                .populate('assignedTo', 'firstName lastName email')
                .populate('project', 'title');
            if (!caseData) {
                return res.status(404).json({
                    success: false,
                    error: 'Case not found',
                });
            }
            res.json({
                success: true,
                data: caseData,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get all cases (admin)
     */
    static async getAll(req, res) {
        try {
            const { status, priority, category, assignedTeam } = req.query;
            const query = {};
            if (status)
                query.status = status;
            if (priority)
                query.priority = priority;
            if (category)
                query.category = category;
            if (assignedTeam)
                query.assignedTeam = assignedTeam;
            const cases = await Case_1.default.find(query)
                .populate('reporter', 'firstName lastName email')
                .populate('assignedTo', 'firstName lastName')
                .sort({ priority: 1, reportedAt: -1 });
            res.json({
                success: true,
                data: cases,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get my cases
     */
    static async getMyCases(req, res) {
        try {
            const userId = req.user.id;
            const cases = await Case_1.default.find({ reporter: userId })
                .populate('project', 'title')
                .sort({ reportedAt: -1 });
            res.json({
                success: true,
                data: cases,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Assign case (admin)
     */
    static async assign(req, res) {
        try {
            const { id } = req.params;
            const { assignedTo, assignedTeam } = req.body;
            const caseData = await Case_1.default.findById(id);
            if (!caseData) {
                return res.status(404).json({
                    success: false,
                    error: 'Case not found',
                });
            }
            caseData.assignedTo = assignedTo;
            caseData.assignedTeam = assignedTeam;
            caseData.status = 'en-cours';
            if (!caseData.firstResponseAt) {
                caseData.firstResponseAt = new Date();
            }
            await caseData.save();
            // Notify assigned person
            if (assignedTo) {
                await NotificationService_1.NotificationService.createNotification({
                    user: assignedTo,
                    type: 'info',
                    title: 'Nouveau cas assigné',
                    message: `${caseData.title} vous a été assigné`,
                    priority: caseData.priority === 'urgent' ? 'urgent' : 'high',
                    link: `/admin/cases/${id}`,
                });
            }
            res.json({
                success: true,
                data: caseData,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Add investigation note (admin)
     */
    static async addNote(req, res) {
        try {
            const { id } = req.params;
            const { note, isInternal, attachments } = req.body;
            const userId = req.user.id;
            const caseData = await Case_1.default.findById(id);
            if (!caseData) {
                return res.status(404).json({
                    success: false,
                    error: 'Case not found',
                });
            }
            caseData.investigationNotes.push({
                note,
                addedBy: userId,
                addedAt: new Date(),
                isInternal: isInternal !== false,
                attachments: attachments || [],
            });
            await caseData.save();
            res.json({
                success: true,
                data: caseData,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Add communication
     */
    static async addCommunication(req, res) {
        try {
            const { id } = req.params;
            const { to, message, isInternal } = req.body;
            const userId = req.user.id;
            const caseData = await Case_1.default.findById(id);
            if (!caseData) {
                return res.status(404).json({
                    success: false,
                    error: 'Case not found',
                });
            }
            caseData.communications.push({
                from: userId,
                to,
                message,
                sentAt: new Date(),
                isInternal: isInternal || false,
            });
            await caseData.save();
            // Send notification to recipient
            if (!isInternal) {
                await NotificationService_1.NotificationService.createNotification({
                    user: to,
                    type: 'info',
                    title: 'Message concernant votre signalement',
                    message: message.substring(0, 100),
                    priority: 'medium',
                    link: `/cases/${id}`,
                });
            }
            res.json({
                success: true,
                data: caseData,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Resolve case (admin)
     */
    static async resolve(req, res) {
        try {
            const { id } = req.params;
            const { outcome, explanation, actionTaken } = req.body;
            const userId = req.user.id;
            const caseData = await Case_1.default.findById(id);
            if (!caseData) {
                return res.status(404).json({
                    success: false,
                    error: 'Case not found',
                });
            }
            caseData.resolution = {
                outcome,
                explanation,
                actionTaken,
                resolvedBy: userId,
                resolvedAt: new Date(),
            };
            caseData.status = 'resolu';
            caseData.resolvedAt = new Date();
            await caseData.save();
            // Notify reporter
            await NotificationService_1.NotificationService.createNotification({
                user: caseData.reporter,
                type: 'success',
                title: 'Votre signalement a été traité',
                message: explanation,
                priority: 'medium',
                link: `/cases/${id}`,
            });
            // Audit log
            await AuditLogService_1.AuditLogService.log({
                actor: userId,
                actorRole: 'admin',
                action: 'case-resolved',
                category: 'moderation',
                targetType: 'Case',
                targetId: id,
                description: `Case resolved: ${outcome}`,
                metadata: { outcome, explanation },
            });
            res.json({
                success: true,
                data: caseData,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Close case
     */
    static async close(req, res) {
        try {
            const { id } = req.params;
            const caseData = await Case_1.default.findById(id);
            if (!caseData) {
                return res.status(404).json({
                    success: false,
                    error: 'Case not found',
                });
            }
            caseData.status = 'ferme';
            caseData.closedAt = new Date();
            await caseData.save();
            res.json({
                success: true,
                data: caseData,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Submit feedback on case resolution
     */
    static async submitFeedback(req, res) {
        try {
            const { id } = req.params;
            const { satisfied, comment } = req.body;
            const userId = req.user.id;
            const caseData = await Case_1.default.findById(id);
            if (!caseData) {
                return res.status(404).json({
                    success: false,
                    error: 'Case not found',
                });
            }
            if (caseData.reporter.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Only the reporter can submit feedback',
                });
            }
            caseData.reporterFeedback = {
                satisfied,
                comment,
                submittedAt: new Date(),
            };
            await caseData.save();
            res.json({
                success: true,
                data: caseData,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
}
exports.CaseController = CaseController;
