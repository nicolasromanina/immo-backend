"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const Report_1 = __importDefault(require("../models/Report"));
const Project_1 = __importDefault(require("../models/Project"));
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = require("../utils/emailService");
class ReportService {
    static async createReport(reportedBy, targetType, targetId, reason, description, evidence) {
        // Validate target exists
        let target;
        switch (targetType) {
            case 'project':
                target = await Project_1.default.findById(targetId);
                break;
            case 'promoteur':
                target = await require('../models/Promoteur').findById(targetId);
                break;
            // Add other cases as needed
            default:
                throw new Error('Invalid target type');
        }
        if (!target) {
            throw new Error('Target not found');
        }
        const report = await Report_1.default.create({
            reportedBy,
            targetType,
            targetId,
            reason,
            description,
            evidence
        });
        // Auto-assign based on rules (simplified)
        await this.autoAssignReport(report);
        // Notify admins
        await this.notifyAdminsOfReport(report);
        return report;
    }
    static async getUserReports(userId) {
        return Report_1.default.find({ reportedBy: userId })
            .populate('targetId', 'title') // This might need adjustment based on targetType
            .sort({ createdAt: -1 });
    }
    static async getAdminReports(filters = {}) {
        const query = {};
        if (filters.status)
            query.status = filters.status;
        if (filters.priority)
            query.priority = filters.priority;
        if (filters.targetType)
            query.targetType = filters.targetType;
        if (filters.assignedTo)
            query.assignedTo = filters.assignedTo;
        return Report_1.default.find(query)
            .populate('reportedBy', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName')
            .populate('targetId') // This will need conditional population based on targetType
            .sort({ createdAt: -1 });
    }
    static async getReportById(reportId) {
        return Report_1.default.findById(reportId)
            .populate('reportedBy', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName')
            .populate('targetId')
            .populate('investigationNotes.addedBy', 'firstName lastName');
    }
    static async assignReport(reportId, adminId, assignedTo) {
        const report = await Report_1.default.findById(reportId);
        if (!report)
            throw new Error('Report not found');
        report.assignedTo = assignedTo;
        await report.save();
        return report;
    }
    static async updateReportStatus(reportId, status, adminId) {
        const report = await Report_1.default.findById(reportId);
        if (!report)
            throw new Error('Report not found');
        report.status = status;
        await report.save();
        return report;
    }
    static async addInvestigationNote(reportId, adminId, note) {
        const report = await Report_1.default.findById(reportId);
        if (!report)
            throw new Error('Report not found');
        report.investigationNotes.push({
            note,
            addedBy: adminId,
            addedAt: new Date()
        });
        await report.save();
        return report;
    }
    static async resolveReport(reportId, adminId, action, notes, applyAction = false) {
        const report = await Report_1.default.findById(reportId);
        if (!report)
            throw new Error('Report not found');
        report.status = 'resolved';
        report.resolution = {
            action,
            notes,
            resolvedBy: adminId,
            resolvedAt: new Date()
        };
        await report.save();
        // Apply action if requested
        if (applyAction) {
            await this.applyResolutionAction(report, action);
        }
        // Notify reporter
        await this.notifyReporterOfResolution(report);
        return report;
    }
    static async dismissReport(reportId, adminId, notes) {
        const report = await Report_1.default.findById(reportId);
        if (!report)
            throw new Error('Report not found');
        report.status = 'dismissed';
        report.resolution = {
            action: 'dismissed',
            notes,
            resolvedBy: adminId,
            resolvedAt: new Date()
        };
        await report.save();
        // Notify reporter
        await this.notifyReporterOfResolution(report);
        return report;
    }
    static async autoAssignReport(report) {
        // Simplified auto-assignment logic
        // In a real app, this would be more sophisticated
        const priority = this.calculatePriority(report);
        report.priority = priority;
        // Auto-assign to admin based on priority or round-robin
        // For now, just set priority
        await report.save();
    }
    static calculatePriority(report) {
        const highPriorityReasons = ['fraud', 'misleading'];
        if (highPriorityReasons.includes(report.reason)) {
            return 'high';
        }
        return 'medium';
    }
    static async applyResolutionAction(report, action) {
        switch (action) {
            case 'warning_sent':
                // Send warning to target
                break;
            case 'project_suspended':
                if (report.targetType === 'project') {
                    await Project_1.default.findByIdAndUpdate(report.targetId, {
                        status: 'suspended'
                    });
                }
                break;
            case 'promoteur_suspended':
                // Suspend promoteur account
                break;
            // Add more actions as needed
        }
    }
    static async notifyAdminsOfReport(report) {
        // Send email to admins
        const admins = await User_1.default.find({ roles: 'admin' });
        for (const admin of admins) {
            await (0, emailService_1.sendEmail)({
                to: admin.email,
                subject: `Nouveau signalement - ${report.priority} priorité`,
                template: 'new-report',
                data: {
                    reportId: report._id,
                    reason: report.reason,
                    targetType: report.targetType,
                    priority: report.priority,
                    adminUrl: `${process.env.ADMIN_URL}/reports/${report._id}`
                }
            });
        }
    }
    static async notifyReporterOfResolution(report) {
        const reporter = await User_1.default.findById(report.reportedBy);
        if (!reporter)
            return;
        await (0, emailService_1.sendEmail)({
            to: reporter.email,
            subject: 'Votre signalement a été traité',
            template: 'report-resolved',
            data: {
                reportId: report._id,
                status: report.status,
                action: report.resolution?.action,
                notes: report.resolution?.notes
            }
        });
    }
}
exports.ReportService = ReportService;
