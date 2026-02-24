"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityIncidentService = void 0;
const SecurityIncident_1 = __importDefault(require("../models/SecurityIncident"));
const User_1 = __importDefault(require("../models/User"));
const NotificationService_1 = require("./NotificationService");
const AuditLogService_1 = require("./AuditLogService");
class SecurityIncidentService {
    /**
     * Create a new security incident
     */
    static async createIncident(data) {
        const incident = new SecurityIncident_1.default({
            title: data.title,
            type: data.type,
            severity: data.severity,
            description: data.description,
            affectedUsers: data.affectedUsers || [],
            affectedPromoteurs: data.affectedPromoteurs || [],
            affectedProjects: data.affectedProjects || [],
            status: 'detected',
            detectedAt: new Date(),
            responseActions: [{
                    action: 'Incident created',
                    performedBy: data.createdBy,
                    performedAt: new Date(),
                }],
        });
        await incident.save();
        // Notify admins immediately for high/critical incidents
        if (['high', 'critical'].includes(data.severity)) {
            await NotificationService_1.NotificationService.create({
                recipient: 'admin',
                type: 'warning',
                title: `🚨 Incident de sécurité ${data.severity.toUpperCase()}`,
                message: data.title,
                priority: 'urgent',
                channels: { inApp: true, email: true },
                data: { incidentId: incident._id },
            });
        }
        // Log the action
        await AuditLogService_1.AuditLogService.log({
            userId: data.createdBy,
            action: 'create_security_incident',
            category: 'security',
            description: `Created security incident: ${data.title}`,
            severity: 'high',
            targetModel: 'SecurityIncident',
            targetId: incident._id.toString(),
        });
        return incident;
    }
    /**
     * Update incident status
     */
    static async updateStatus(incidentId, status, userId, notes) {
        const updateData = { status };
        if (status === 'contained')
            updateData.containedAt = new Date();
        if (status === 'resolved')
            updateData.resolvedAt = new Date();
        if (status === 'closed')
            updateData.closedAt = new Date();
        const incident = await SecurityIncident_1.default.findByIdAndUpdate(incidentId, {
            ...updateData,
            $push: {
                responseActions: {
                    action: `Status changed to ${status}`,
                    performedBy: userId,
                    performedAt: new Date(),
                    notes,
                },
            },
        }, { new: true });
        await AuditLogService_1.AuditLogService.log({
            userId,
            action: 'update_incident_status',
            category: 'security',
            description: `Updated incident status to ${status}`,
            severity: 'medium',
            targetModel: 'SecurityIncident',
            targetId: incidentId,
        });
        return incident;
    }
    /**
     * Add investigation note
     */
    static async addNote(incidentId, note, userId) {
        return SecurityIncident_1.default.findByIdAndUpdate(incidentId, {
            $push: {
                investigationNotes: {
                    note,
                    addedBy: userId,
                    addedAt: new Date(),
                },
            },
        }, { new: true });
    }
    /**
     * Add response action
     */
    static async addResponseAction(incidentId, action, userId, notes) {
        return SecurityIncident_1.default.findByIdAndUpdate(incidentId, {
            $push: {
                responseActions: {
                    action,
                    performedBy: userId,
                    performedAt: new Date(),
                    notes,
                },
            },
        }, { new: true });
    }
    /**
     * Assign investigator
     */
    static async assignInvestigator(incidentId, investigatorId, isLead = false) {
        const update = {
            $addToSet: { assignedTo: investigatorId },
        };
        if (isLead) {
            update.leadInvestigator = investigatorId;
        }
        return SecurityIncident_1.default.findByIdAndUpdate(incidentId, update, { new: true });
    }
    /**
     * Send notification to affected users
     */
    static async notifyAffectedUsers(incidentId, content, recipientType) {
        const incident = await SecurityIncident_1.default.findById(incidentId);
        if (!incident)
            throw new Error('Incident not found');
        let recipients = [];
        if (recipientType === 'affected_users') {
            recipients = incident.affectedUsers.map(u => u.toString());
        }
        else if (recipientType === 'all_users') {
            const users = await User_1.default.find({ isActive: true }).select('_id');
            recipients = users.map(u => u._id.toString());
        }
        for (const recipientId of recipients) {
            await NotificationService_1.NotificationService.create({
                recipient: recipientId,
                type: 'warning',
                title: 'Notification de sécurité',
                message: content,
                priority: 'urgent',
                channels: { inApp: true, email: true },
            });
        }
        await SecurityIncident_1.default.findByIdAndUpdate(incidentId, {
            $push: {
                notificationsSent: {
                    type: 'email',
                    recipientType,
                    sentAt: new Date(),
                    content,
                },
            },
        });
        return recipients.length;
    }
    /**
     * Set root cause
     */
    static async setRootCause(incidentId, rootCause, userId) {
        const incident = await SecurityIncident_1.default.findByIdAndUpdate(incidentId, {
            rootCause,
            $push: {
                responseActions: {
                    action: 'Root cause identified',
                    performedBy: userId,
                    performedAt: new Date(),
                    notes: rootCause,
                },
            },
        }, { new: true });
        return incident;
    }
    /**
     * Submit regulatory report
     */
    static async submitRegulatoryReport(incidentId, reportRef, userId) {
        return SecurityIncident_1.default.findByIdAndUpdate(incidentId, {
            regulatoryReportSubmittedAt: new Date(),
            regulatoryReportRef: reportRef,
            $push: {
                responseActions: {
                    action: 'Regulatory report submitted',
                    performedBy: userId,
                    performedAt: new Date(),
                    notes: `Reference: ${reportRef}`,
                },
            },
        }, { new: true });
    }
    /**
     * Get all incidents
     */
    static async getIncidents(filters) {
        const query = {};
        if (filters.status)
            query.status = filters.status;
        if (filters.severity)
            query.severity = filters.severity;
        if (filters.type)
            query.type = filters.type;
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const incidents = await SecurityIncident_1.default.find(query)
            .populate('leadInvestigator', 'email firstName lastName')
            .populate('assignedTo', 'email firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await SecurityIncident_1.default.countDocuments(query);
        return {
            incidents,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            },
        };
    }
    /**
     * Get incident by ID
     */
    static async getIncidentById(incidentId) {
        return SecurityIncident_1.default.findById(incidentId)
            .populate('affectedUsers', 'email firstName lastName')
            .populate('affectedPromoteurs', 'organizationName')
            .populate('affectedProjects', 'title')
            .populate('assignedTo', 'email firstName lastName')
            .populate('leadInvestigator', 'email firstName lastName')
            .populate('responseActions.performedBy', 'email')
            .populate('investigationNotes.addedBy', 'email');
    }
    /**
     * Get active incidents count
     */
    static async getActiveIncidentsCount() {
        return SecurityIncident_1.default.countDocuments({
            status: { $nin: ['resolved', 'closed'] },
        });
    }
    /**
     * Get critical incidents
     */
    static async getCriticalIncidents() {
        return SecurityIncident_1.default.find({
            severity: { $in: ['high', 'critical'] },
            status: { $nin: ['resolved', 'closed'] },
        }).sort({ createdAt: -1 });
    }
}
exports.SecurityIncidentService = SecurityIncidentService;
