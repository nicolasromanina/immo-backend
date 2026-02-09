import { Request, Response } from 'express';
import { CourtierWorkflowService, ArchitectWorkflowService, NotaireWorkflowService } from '../services/PartnerWorkflowService';
import { AuthRequest } from '../middlewares/auth';

// ===== Courtier =====
export const preQualifyLead = async (req: AuthRequest, res: Response) => {
  try {
    const result = await CourtierWorkflowService.preQualifyLead({
      courtierId: req.body.courtierId,
      leadId: req.params.leadId,
      qualificationData: req.body.qualificationData,
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getCourtierStats = async (req: Request, res: Response) => {
  try {
    const stats = await CourtierWorkflowService.getCourtierStats(req.params.courtierId);
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ===== Architecte =====
export const submitPortfolio = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await ArchitectWorkflowService.submitPortfolio(
      req.params.partnerId,
      req.body
    );
    if (!partner) return res.status(404).json({ message: 'Partenaire non trouvé' });
    res.json(partner);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const requestDevis = async (req: AuthRequest, res: Response) => {
  try {
    const request = await ArchitectWorkflowService.requestDevis({
      clientId: req.user!.id,
      architecteId: req.params.partnerId,
      ...req.body,
    });
    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const submitDevis = async (req: AuthRequest, res: Response) => {
  try {
    const request = await ArchitectWorkflowService.submitDevis(req.params.requestId, req.body);
    if (!request) return res.status(404).json({ message: 'Demande non trouvée' });
    res.json(request);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ===== Notaire =====
export const requestConsultation = async (req: AuthRequest, res: Response) => {
  try {
    const request = await NotaireWorkflowService.requestConsultation({
      clientId: req.user!.id,
      notaireId: req.params.partnerId,
      ...req.body,
    });
    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const scheduleNotaireAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const appointment = await NotaireWorkflowService.scheduleAppointment(
      req.params.requestId,
      req.body
    );
    res.status(201).json(appointment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const submitConsultationReport = async (req: AuthRequest, res: Response) => {
  try {
    const request = await NotaireWorkflowService.submitConsultationReport(
      req.params.requestId,
      req.body
    );
    if (!request) return res.status(404).json({ message: 'Demande non trouvée' });
    res.json(request);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getNotaireAvailability = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const availability = await NotaireWorkflowService.getNotaireAvailability(
      req.params.partnerId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json(availability);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
