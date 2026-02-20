import { Request, Response } from 'express';
import { ReportingService } from '../services/ReportingService';
import { SLATrackingService } from '../services/SLATrackingService';
import { AutomatedSanctionsService } from '../services/AutomatedSanctionsService';

export class ReportingController {
    /**
   * Generate monthly platform report (admin)
   */
  static async getMonthlyReport(req: Request, res: Response) {
    try {
      const { year, month } = req.query;

      const currentDate = new Date();
      const reportYear = year ? parseInt(year as string) : currentDate.getFullYear();
      const reportMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;

      const report = await ReportingService.generateMonthlyReport(reportYear, reportMonth);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Generate promoteur performance report
   */
  static async getPromoteurReport(req: Request, res: Response) {
    try {
      const { promoteurId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate 
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days

      const end = endDate 
        ? new Date(endDate as string)
        : new Date();

      const report = await ReportingService.generatePromoteurReport(promoteurId, start, end);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get discipline dashboard (update cadence)
   */
  static async getDisciplineDashboard(req: Request, res: Response) {
    try {
      const dashboard = await ReportingService.generateDisciplineDashboard();

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get SLA dashboard for a promoteur
   */
  static async getSLADashboard(req: Request, res: Response) {
    try {
      const { promoteurId } = req.params;

      const dashboard = await SLATrackingService.getSLADashboard(promoteurId);

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get sanction history for a promoteur
   */
  static async getSanctionHistory(req: Request, res: Response) {
    try {
      const { promoteurId } = req.params;

      const history = await AutomatedSanctionsService.getSanctionHistory(promoteurId);

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
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get my SLA dashboard (promoteur)
   */
  static async getMySLADashboard(req: Request, res: Response) {
    try {
      const promoteurId = (req as any).user.promoteurProfile;

      if (!promoteurId) {
        return res.status(403).json({
          success: false,
          error: 'Not a promoteur',
        });
      }

      const dashboard = await SLATrackingService.getSLADashboard(promoteurId.toString());

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get my promoteur performance report
   */
  static async getMyPromoteurReport(req: Request, res: Response) {
    try {
      const promoteurId = (req as any).user?.promoteurProfile;

      if (!promoteurId) {
        return res.status(403).json({ success: false, error: 'Not a promoteur' });
      }

      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const report = await ReportingService.generatePromoteurReport(promoteurId.toString(), start, end);

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Get my sanction history (promoteur)
   */
  static async getMySanctionHistory(req: Request, res: Response) {
    try {
      const promoteurId = (req as any).user.promoteurProfile;

      if (!promoteurId) {
        return res.status(403).json({
          success: false,
          error: 'Not a promoteur',
        });
      }

      const history = await AutomatedSanctionsService.getSanctionHistory(promoteurId.toString());

      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Trigger SLA monitoring (admin/cron)
   */
  static async triggerSLAMonitoring(req: Request, res: Response) {
    try {
      const hoursBack = parseInt(req.query.hoursBack as string) || 72;

      const updates = await SLATrackingService.monitorRecentLeads(hoursBack);

      res.json({
        success: true,
        data: {
          leadsProcessed: updates.length,
          updates,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Trigger automated sanctions check (admin/cron)
   */
  static async triggerSanctionsCheck(req: Request, res: Response) {
    try {
      const sanctions = await AutomatedSanctionsService.checkUpdateFrequency();

      res.json({
        success: true,
        data: {
          sanctionsApplied: sanctions.length,
          sanctions,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Remove expired restrictions (admin/cron)
   */
  static async removeExpiredRestrictions(req: Request, res: Response) {
    try {
      const result = await AutomatedSanctionsService.removeExpiredRestrictions();

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}
