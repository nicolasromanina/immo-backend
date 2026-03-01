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
exports.LeadController = void 0;
const Lead_1 = __importDefault(require("../models/Lead"));
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const User_1 = __importDefault(require("../models/User"));
const Appointment_1 = __importDefault(require("../models/Appointment"));
const Availability_1 = __importDefault(require("../models/Availability"));
const LeadScoringService_1 = require("../services/LeadScoringService");
const NotificationService_1 = require("../services/NotificationService");
const RealTimeNotificationService_1 = require("../services/RealTimeNotificationService");
const AuditLogService_1 = require("../services/AuditLogService");
const CRMWebhookService_1 = require("../services/CRMWebhookService");
const LeadTagService_1 = require("../services/LeadTagService");
class LeadController {
    /**
     * Create a lead (from client side)
     */
    static async createLead(req, res) {
        try {
            console.log('[LeadController.createLead] Headers:', req.headers);
            console.log('[LeadController.createLead] req.user:', req.user);
            const { projectId, firstName, lastName, email, phone, whatsapp, budget, financingType, timeframe, interestedTypology, initialMessage, contactMethod, } = req.body;
            const project = await Project_1.default.findById(projectId);
            if (!project || project.publicationStatus !== 'published') {
                return res.status(404).json({ message: 'Project not found or not available' });
            }
            if (!firstName || !lastName || !email || !phone) {
                return res.status(400).json({ message: 'Missing required contact fields' });
            }
            if (!initialMessage || typeof initialMessage !== 'string') {
                return res.status(400).json({ message: 'initialMessage is required' });
            }
            if (!timeframe) {
                return res.status(400).json({ message: 'timeframe is required' });
            }
            if (!contactMethod) {
                return res.status(400).json({ message: 'contactMethod is required' });
            }
            // If user is authenticated, capture their ID as the lead.client
            const clientId = req.user?.id || undefined;
            console.log('[LeadController.createLead] Creating lead with clientId:', clientId);
            const lead = await LeadScoringService_1.LeadScoringService.createLead({
                projectId,
                promoteurId: project.promoteur.toString(),
                clientId,
                firstName,
                lastName,
                email,
                phone,
                whatsapp,
                budget,
                financingType,
                timeframe,
                interestedTypology,
                initialMessage,
                contactMethod,
                source: 'contact-form',
            });
            // Update promoteur stats
            await Promoteur_1.default.findByIdAndUpdate(project.promoteur, {
                $inc: { totalLeadsReceived: 1 },
            });
            res.status(201).json({ lead });
            // Non-blocking notifications/webhooks to avoid client timeouts when SMTP is slow.
            void (async () => {
                try {
                    const promoteur = await Promoteur_1.default.findById(project.promoteur).populate('user');
                    if (promoteur?.user) {
                        await NotificationService_1.NotificationService.notifyNewLead({
                            promoteurUserId: promoteur.user._id.toString(),
                            leadId: lead._id.toString(),
                            projectTitle: project.title,
                            leadName: `${firstName} ${lastName}`,
                            leadScore: lead.score,
                        });
                        await RealTimeNotificationService_1.RealTimeNotificationService.notifyNewLead(promoteur.user._id.toString(), lead);
                    }
                    await CRMWebhookService_1.CRMWebhookService.pushEvent({
                        promoteurId: project.promoteur.toString(),
                        event: 'lead.created',
                        payload: { leadId: lead._id.toString(), projectId: project._id.toString() },
                    });
                }
                catch (notificationError) {
                    console.error('[LeadController.createLead] Async notification/webhook error:', notificationError);
                }
            })();
        }
        catch (error) {
            console.error('Error creating lead:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get leads for promoteur
     */
    static async getLeads(req, res) {
        try {
            // Use promoteurProfile from middleware (already resolved for owner or team member)
            const promoteurId = req.user.promoteurProfile;
            if (!promoteurId) {
                return res.status(403).json({ message: 'Only promoteurs can access leads' });
            }
            const { projectId, status, score, page = 1, limit = 20, } = req.query;
            const query = { promoteur: promoteurId };
            if (projectId)
                query.project = projectId;
            if (status)
                query.status = status;
            if (score)
                query.score = score;
            const skip = (Number(page) - 1) * Number(limit);
            const leads = await Lead_1.default.find(query)
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip(skip)
                .populate('project', 'title slug')
                .populate('client', 'firstName lastName email');
            const total = await Lead_1.default.countDocuments(query);
            // Stats by score
            const scoreStats = await Lead_1.default.aggregate([
                { $match: { promoteur: promoteurId } },
                { $group: { _id: '$score', count: { $sum: 1 } } },
            ]);
            // Stats by status
            const statusStats = await Lead_1.default.aggregate([
                { $match: { promoteur: promoteurId } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]);
            res.json({
                leads,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit),
                },
                stats: {
                    byScore: scoreStats,
                    byStatus: statusStats,
                },
            });
        }
        catch (error) {
            console.error('Error getting leads:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get single lead
     */
    static async getLead(req, res) {
        try {
            const { id } = req.params;
            const promoteurId = req.user.promoteurProfile;
            const lead = await Lead_1.default.findById(id)
                .populate('project', 'title slug media')
                .populate('client', 'firstName lastName email phone')
                .populate('notes.addedBy', 'firstName lastName');
            if (!lead) {
                return res.status(404).json({ message: 'Lead not found' });
            }
            // Check ownership - use promoteurId from middleware
            if (lead.promoteur.toString() !== promoteurId?.toString()) {
                return res.status(403).json({ message: 'Not authorized to view this lead' });
            }
            res.json({ lead });
        }
        catch (error) {
            console.error('Error getting lead:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update lead status
     */
    static async updateLeadStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            const promoteurId = req.user.promoteurProfile;
            const userId = req.user.id;
            if (!promoteurId) {
                return res.status(403).json({ message: 'Not authorized - promoteur profile not found' });
            }
            const lead = await Lead_1.default.findById(id);
            if (!lead) {
                return res.status(404).json({ message: 'Lead not found' });
            }
            // Check ownership - use promoteurId from middleware
            if (lead.promoteur.toString() !== promoteurId.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
            const canUsePipeline = await PlanLimitService.checkCapability(promoteurId.toString(), 'leadPipeline');
            if (!canUsePipeline) {
                return res.status(403).json({
                    message: 'Le pipeline avance de leads n est pas disponible sur votre plan',
                    upgrade: true,
                });
            }
            // Update lead status first
            await LeadScoringService_1.LeadScoringService.updateLeadStatus(id, status, userId.toString(), notes);
            // Record first contact if status changes from 'nouveau'
            if (lead.status === 'nouveau' && status !== 'nouveau') {
                // Record response time
                await LeadScoringService_1.LeadScoringService.recordResponse(id);
                // Mark lead as contacted (do this AFTER updateLeadStatus to avoid conflicts)
                await LeadTagService_1.LeadTagService.markAsContacted(id);
                // Update promoteur average response time
                const allLeads = await Lead_1.default.find({
                    promoteur: promoteurId,
                    responseTime: { $exists: true }
                });
                if (allLeads.length > 0) {
                    const avgResponseTime = allLeads.reduce((sum, l) => sum + (l.responseTime || 0), 0) / allLeads.length;
                    await Promoteur_1.default.findByIdAndUpdate(promoteurId, {
                        averageResponseTime: avgResponseTime,
                    });
                }
            }
            const updatedLead = await Lead_1.default.findById(id);
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'update_lead_status', 'lead', `Updated lead status to ${status}`, 'Lead', id, { oldStatus: lead.status, newStatus: status });
            await CRMWebhookService_1.CRMWebhookService.pushEvent({
                promoteurId: lead.promoteur.toString(),
                event: 'lead.status_changed',
                payload: { leadId: id, status },
            });
            // Notify client of status change via WebSocket
            if (lead.client) {
                await RealTimeNotificationService_1.RealTimeNotificationService.notifyLeadStatusChange(lead.client.toString(), lead, status);
            }
            res.json({ lead: updatedLead });
        }
        catch (error) {
            console.error('Error updating lead status:', error);
            if (error?.message?.includes('Lead pipeline is not available on this plan')) {
                return res.status(403).json({
                    message: 'Le pipeline avance de leads n est pas disponible sur votre plan',
                    upgrade: true,
                });
            }
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get promoteur availability
     */
    static async getPromoteurAvailability(req, res) {
        try {
            const { promoteurId } = req.params;
            const availability = await Availability_1.default.findOne({ promoteur: promoteurId });
            res.json({ availability });
        }
        catch (error) {
            console.error('Error getting promoteur availability:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Schedule an appointment for a lead
     */
    static async scheduleAppointment(req, res) {
        try {
            const { id } = req.params;
            const { scheduledAt, durationMinutes = 30, type, notes } = req.body;
            const user = await User_1.default.findById(req.user.id);
            const lead = await Lead_1.default.findById(id).populate('project');
            if (!lead) {
                return res.status(404).json({ message: 'Lead not found' });
            }
            const isOwner = lead.promoteur.toString() === user?.promoteurProfile?.toString();
            const isClient = lead.client && lead.client.toString() === req.user.id;
            if (!isOwner && !isClient) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
            const canScheduleAppointments = await PlanLimitService.checkCapability(lead.promoteur.toString(), 'calendarAppointments');
            if (!canScheduleAppointments) {
                return res.status(403).json({
                    message: 'La prise de rendez-vous n est pas disponible sur votre plan',
                    upgrade: true,
                });
            }
            if (!scheduledAt || !type) {
                return res.status(400).json({ message: 'scheduledAt and type are required' });
            }
            const date = new Date(scheduledAt);
            if (Number.isNaN(date.getTime()) || date <= new Date()) {
                return res.status(400).json({ message: 'scheduledAt must be a future date' });
            }
            const availability = await Availability_1.default.findOne({ promoteur: lead.promoteur });
            if (availability) {
                const day = date.getUTCDay();
                const daySlots = availability.weeklySlots.find(s => s.dayOfWeek === day);
                const time = date.toISOString().slice(11, 16);
                const isBlackout = availability.blackoutDates.some(d => d.toISOString().slice(0, 10) === date.toISOString().slice(0, 10));
                if (isBlackout || !daySlots || !daySlots.slots.some(slot => time >= slot.start && time < slot.end)) {
                    return res.status(400).json({ message: 'Selected time is outside availability' });
                }
            }
            const conflict = await Appointment_1.default.findOne({
                promoteur: lead.promoteur,
                scheduledAt: {
                    $lt: new Date(date.getTime() + durationMinutes * 60000),
                    $gte: new Date(date.getTime() - durationMinutes * 60000),
                },
                status: { $in: ['requested', 'confirmed'] },
            });
            if (conflict) {
                return res.status(400).json({ message: 'Time slot already booked' });
            }
            const appointment = await Appointment_1.default.create({
                promoteur: lead.promoteur,
                project: lead.project,
                lead: lead._id,
                scheduledAt: date,
                durationMinutes,
                type,
                notes,
                createdBy: user._id,
                status: isOwner ? 'confirmed' : 'requested',
            });
            lead.meetingScheduled = {
                date,
                type,
                notes,
                calendarLink: `internal://appointment/${appointment._id}`,
            };
            await lead.save();
            await LeadScoringService_1.LeadScoringService.updateLeadStatus(lead._id.toString(), 'rdv-planifie', user._id.toString(), notes);
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'schedule_appointment', 'lead', 'Scheduled an appointment', 'Lead', lead._id.toString(), { scheduledAt: date, type });
            await CRMWebhookService_1.CRMWebhookService.pushEvent({
                promoteurId: lead.promoteur.toString(),
                event: 'lead.appointment_scheduled',
                payload: { leadId: lead._id.toString(), appointmentId: appointment._id.toString() },
            });
            res.status(201).json({ appointment });
        }
        catch (error) {
            console.error('Error scheduling appointment:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get appointments for promoteur
     */
    static async getAppointments(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(403).json({ message: 'Only promoteurs can access appointments' });
            }
            const { from, to } = req.query;
            const query = { promoteur: user.promoteurProfile };
            if (from || to) {
                query.scheduledAt = {};
                if (from)
                    query.scheduledAt.$gte = new Date(from);
                if (to)
                    query.scheduledAt.$lte = new Date(to);
            }
            const appointments = await Appointment_1.default.find(query)
                .sort({ scheduledAt: 1 })
                .populate('lead', 'firstName lastName email phone')
                .populate('project', 'title slug');
            res.json({ appointments });
        }
        catch (error) {
            console.error('Error getting appointments:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Add note to lead
     */
    static async addNote(req, res) {
        try {
            const { id } = req.params;
            const { content, isPrivate } = req.body;
            const promoteurId = req.user.promoteurProfile;
            const userId = req.user.id;
            const lead = await Lead_1.default.findById(id);
            if (!lead) {
                return res.status(404).json({ message: 'Lead not found' });
            }
            // Check ownership - use promoteurId from middleware
            if (lead.promoteur.toString() !== promoteurId?.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            lead.notes.push({
                content,
                addedBy: userId,
                addedAt: new Date(),
                isPrivate: isPrivate || false,
            });
            await lead.save();
            res.json({ lead });
        }
        catch (error) {
            console.error('Error adding note:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Flag lead as not serious
     */
    static async flagAsNotSerious(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const promoteurId = req.user.promoteurProfile;
            const lead = await Lead_1.default.findById(id);
            if (!lead) {
                return res.status(404).json({ message: 'Lead not found' });
            }
            // Check ownership - use promoteurId from middleware
            if (lead.promoteur.toString() !== promoteurId?.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            lead.flaggedAsNotSerious = true;
            lead.flagReason = reason;
            lead.isSerious = false;
            await lead.save();
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'flag_lead_not_serious', 'lead', `Flagged lead as not serious: ${reason}`, 'Lead', id);
            res.json({ lead });
        }
        catch (error) {
            console.error('Error flagging lead:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Export leads to CSV
     */
    static async exportLeads(req, res) {
        try {
            const promoteurId = req.user.promoteurProfile;
            if (!promoteurId) {
                return res.status(403).json({ message: 'Only promoteurs can export leads' });
            }
            const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
            const canExport = await PlanLimitService.checkCapability(promoteurId.toString(), 'leadExport');
            if (!canExport) {
                return res.status(403).json({
                    message: 'L export CSV des leads n est pas disponible sur votre plan',
                    upgrade: true,
                });
            }
            const { projectId, status, score } = req.query;
            const query = { promoteur: promoteurId };
            if (projectId)
                query.project = projectId;
            if (status)
                query.status = status;
            if (score)
                query.score = score;
            const leads = await Lead_1.default.find(query)
                .populate('project', 'title')
                .sort({ createdAt: -1 });
            // Generate CSV data
            const csvHeader = 'Date,Project,Name,Email,Phone,Score,Budget,Status,Financing\n';
            const csvRows = leads.map(lead => {
                const project = lead.project?.title || '';
                return `${lead.createdAt.toISOString()},${project},${lead.firstName} ${lead.lastName},${lead.email},${lead.phone},${lead.score},${lead.budget},${lead.status},${lead.financingType}`;
            }).join('\n');
            const csv = csvHeader + csvRows;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
            res.send(csv);
        }
        catch (error) {
            console.error('Error exporting leads:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Assign lead to team member
     */
    static async assignLead(req, res) {
        try {
            const { id } = req.params;
            const { teamMemberId } = req.body;
            const promoteurId = req.user.promoteurProfile;
            const lead = await Lead_1.default.findById(id);
            if (!lead) {
                return res.status(404).json({ message: 'Lead not found' });
            }
            // Check ownership - use promoteurId from middleware
            if (lead.promoteur.toString() !== promoteurId?.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
            const canUsePipeline = await PlanLimitService.checkCapability(lead.promoteur.toString(), 'leadPipeline');
            if (!canUsePipeline) {
                return res.status(403).json({
                    message: 'Le pipeline avance de leads n est pas disponible sur votre plan',
                    upgrade: true,
                });
            }
            lead.assignedTo = teamMemberId;
            await lead.save();
            res.json({ lead });
        }
        catch (error) {
            console.error('Error assigning lead:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.LeadController = LeadController;
