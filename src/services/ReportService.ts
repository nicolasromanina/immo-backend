import Report from '../models/Report';
import Project from '../models/Project';
import User from '../models/User';
import { sendEmail } from '../utils/emailService';

export class ReportService {
  static async createReport(
    reportedBy: string,
    targetType: 'project' | 'update' | 'document' | 'promoteur',
    targetId: string,
    reason: string,
    description: string,
    evidence?: string[]
  ) {
    // Validate target exists
    let target;
    switch (targetType) {
      case 'project':
        target = await Project.findById(targetId);
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

    const report = await Report.create({
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

  static async getUserReports(userId: string) {
    return Report.find({ reportedBy: userId })
      .populate('targetId', 'title') // This might need adjustment based on targetType
      .sort({ createdAt: -1 });
  }

  static async getAdminReports(filters: any = {}) {
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.targetType) query.targetType = filters.targetType;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;

    return Report.find(query)
      .populate('reportedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName')
      .populate('targetId') // This will need conditional population based on targetType
      .sort({ createdAt: -1 });
  }

  static async getReportById(reportId: string) {
    return Report.findById(reportId)
      .populate('reportedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName')
      .populate('targetId')
      .populate('investigationNotes.addedBy', 'firstName lastName');
  }

  static async assignReport(reportId: string, adminId: string, assignedTo: string) {
    const report = await Report.findById(reportId);
    if (!report) throw new Error('Report not found');

    report.assignedTo = assignedTo as any;
    await report.save();

    return report;
  }

  static async updateReportStatus(reportId: string, status: string, adminId: string) {
    const report = await Report.findById(reportId);
    if (!report) throw new Error('Report not found');

    report.status = status as any;
    await report.save();

    return report;
  }

  static async addInvestigationNote(reportId: string, adminId: string, note: string) {
    const report = await Report.findById(reportId);
    if (!report) throw new Error('Report not found');

    report.investigationNotes.push({
      note,
      addedBy: adminId as any,
      addedAt: new Date()
    });

    await report.save();
    return report;
  }

  static async resolveReport(
    reportId: string,
    adminId: string,
    action: string,
    notes: string,
    applyAction: boolean = false
  ) {
    const report = await Report.findById(reportId);
    if (!report) throw new Error('Report not found');

    report.status = 'resolved';
    report.resolution = {
      action,
      notes,
      resolvedBy: adminId as any,
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

  static async dismissReport(reportId: string, adminId: string, notes: string) {
    const report = await Report.findById(reportId);
    if (!report) throw new Error('Report not found');

    report.status = 'dismissed';
    report.resolution = {
      action: 'dismissed',
      notes,
      resolvedBy: adminId as any,
      resolvedAt: new Date()
    };

    await report.save();

    // Notify reporter
    await this.notifyReporterOfResolution(report);

    return report;
  }

  private static async autoAssignReport(report: any) {
    // Simplified auto-assignment logic
    // In a real app, this would be more sophisticated
    const priority = this.calculatePriority(report);
    report.priority = priority;

    // Auto-assign to admin based on priority or round-robin
    // For now, just set priority
    await report.save();
  }

  private static calculatePriority(report: any): 'low' | 'medium' | 'high' {
    const highPriorityReasons = ['fraud', 'misleading'];
    if (highPriorityReasons.includes(report.reason)) {
      return 'high';
    }
    return 'medium';
  }

  private static async applyResolutionAction(report: any, action: string) {
    switch (action) {
      case 'warning_sent':
        // Send warning to target
        break;
      case 'project_suspended':
        if (report.targetType === 'project') {
          await Project.findByIdAndUpdate(report.targetId, {
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

  private static async notifyAdminsOfReport(report: any) {
    // Send email to admins
    const admins = await User.find({ roles: 'admin' });

    for (const admin of admins) {
      await sendEmail({
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

  private static async notifyReporterOfResolution(report: any) {
    const reporter = await User.findById(report.reportedBy);

    if (!reporter) return;

    await sendEmail({
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