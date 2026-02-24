"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingController = void 0;
const ReportingService_1 = require("../services/ReportingService");
const SLATrackingService_1 = require("../services/SLATrackingService");
const AutomatedSanctionsService_1 = require("../services/AutomatedSanctionsService");
class ReportingController {
    /**
   * Generate monthly platform report (admin)
   */
    static async getMonthlyReport(req, res) {
        try {
            const { year, month } = req.query;
            const currentDate = new Date();
            const reportYear = year ? parseInt(year) : currentDate.getFullYear();
            const reportMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
            const report = await ReportingService_1.ReportingService.generateMonthlyReport(reportYear, reportMonth);
            res.json({
                success: true,
                data: report,
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
     * Generate promoteur performance report
     */
    static async getPromoteurReport(req, res) {
        try {
            const { promoteurId } = req.params;
            const { startDate, endDate } = req.query;
            const start = startDate
                ? new Date(startDate)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
            const end = endDate
                ? new Date(endDate)
                : new Date();
            const report = await ReportingService_1.ReportingService.generatePromoteurReport(promoteurId, start, end);
            res.json({
                success: true,
                data: report,
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
     * Get discipline dashboard (update cadence)
     */
    static async getDisciplineDashboard(req, res) {
        try {
            const dashboard = await ReportingService_1.ReportingService.generateDisciplineDashboard();
            res.json({
                success: true,
                data: dashboard,
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
     * Get SLA dashboard for a promoteur
     */
    static async getSLADashboard(req, res) {
        try {
            const { promoteurId } = req.params;
            const dashboard = await SLATrackingService_1.SLATrackingService.getSLADashboard(promoteurId);
            res.json({
                success: true,
                data: dashboard,
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
     * Get sanction history for a promoteur
     */
    static async getSanctionHistory(req, res) {
        try {
            const { promoteurId } = req.params;
            const history = await AutomatedSanctionsService_1.AutomatedSanctionsService.getSanctionHistory(promoteurId);
            if (!history) {
                return res.status(404).json({
                    success: false,
                    error: 'Promoteur not found',
                });
            }
            res.json({
                success: true,
                data: history,
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
     * Get my SLA dashboard (promoteur)
     */
    static async getMySLADashboard(req, res) {
        try {
            const promoteurId = req.user.promoteurProfile;
            if (!promoteurId) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a promoteur',
                });
            }
            const dashboard = await SLATrackingService_1.SLATrackingService.getSLADashboard(promoteurId.toString());
            res.json({
                success: true,
                data: dashboard,
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
     * Get my promoteur performance report
     */
    static async getMyPromoteurReport(req, res) {
        try {
            const promoteurId = req.user?.promoteurProfile;
            if (!promoteurId) {
                return res.status(403).json({ success: false, error: 'Not a promoteur' });
            }
            const { startDate, endDate } = req.query;
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();
            const report = await ReportingService_1.ReportingService.generatePromoteurReport(promoteurId.toString(), start, end);
            res.json({ success: true, data: report });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
    /**
     * Get my sanction history (promoteur)
     */
    static async getMySanctionHistory(req, res) {
        try {
            const promoteurId = req.user.promoteurProfile;
            if (!promoteurId) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a promoteur',
                });
            }
            const history = await AutomatedSanctionsService_1.AutomatedSanctionsService.getSanctionHistory(promoteurId.toString());
            res.json({
                success: true,
                data: history,
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
     * Trigger SLA monitoring (admin/cron)
     */
    static async triggerSLAMonitoring(req, res) {
        try {
            const hoursBack = parseInt(req.query.hoursBack) || 72;
            const updates = await SLATrackingService_1.SLATrackingService.monitorRecentLeads(hoursBack);
            res.json({
                success: true,
                data: {
                    leadsProcessed: updates.length,
                    updates,
                },
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
     * Trigger automated sanctions check (admin/cron)
     */
    static async triggerSanctionsCheck(req, res) {
        try {
            const sanctions = await AutomatedSanctionsService_1.AutomatedSanctionsService.checkUpdateFrequency();
            res.json({
                success: true,
                data: {
                    sanctionsApplied: sanctions.length,
                    sanctions,
                },
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
     * Remove expired restrictions (admin/cron)
     */
    static async removeExpiredRestrictions(req, res) {
        try {
            const result = await AutomatedSanctionsService_1.AutomatedSanctionsService.removeExpiredRestrictions();
            res.json({
                success: true,
                data: result,
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
exports.ReportingController = ReportingController;
