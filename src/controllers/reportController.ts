import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { ReportService } from '../services/ReportService';

export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const { targetType, targetId, reason, description, evidence } = req.body;
    const report = await ReportService.createReport(
      req.user!.id,
      targetType,
      targetId,
      reason,
      description,
      evidence
    );
    res.status(201).json({ report });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getUserReports = async (req: AuthRequest, res: Response) => {
  try {
    const reports = await ReportService.getUserReports(req.user!.id);
    res.json({ reports });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminReports = async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, targetType, assignedTo } = req.query;
    const reports = await ReportService.getAdminReports({
      status,
      priority,
      targetType,
      assignedTo
    });
    res.json({ reports });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getReportById = async (req: AuthRequest, res: Response) => {
  try {
    const report = await ReportService.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.json({ report });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const assignReport = async (req: AuthRequest, res: Response) => {
  try {
    const { assignedTo } = req.body;
    const report = await ReportService.assignReport(req.params.id, req.user!.id, assignedTo);
    res.json({ report });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateReportStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const report = await ReportService.updateReportStatus(req.params.id, status, req.user!.id);
    res.json({ report });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const addInvestigationNote = async (req: AuthRequest, res: Response) => {
  try {
    const { note } = req.body;
    const report = await ReportService.addInvestigationNote(req.params.id, req.user!.id, note);
    res.json({ report });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const resolveReport = async (req: AuthRequest, res: Response) => {
  try {
    const { action, notes, applyAction } = req.body;
    const report = await ReportService.resolveReport(
      req.params.id,
      req.user!.id,
      action,
      notes,
      applyAction
    );
    res.json({ report });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const dismissReport = async (req: AuthRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const report = await ReportService.dismissReport(req.params.id, req.user!.id, notes);
    res.json({ report });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};