import { Request, Response } from 'express';
import { VIPRejectionService } from '../services/VIPRejectionService';
import { AuthRequest } from '../middlewares/auth';

export const submitBypassRequest = async (req: AuthRequest, res: Response) => {
  try {
    const request = await VIPRejectionService.submitBypassRequest({
      ...req.body,
      requestedBy: req.user!.id,
    });
    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const processDecision = async (req: AuthRequest, res: Response) => {
  try {
    const result = await VIPRejectionService.processDecision({
      requestId: req.params.id,
      decision: req.body.decision,
      decidedBy: req.user!.id,
      justification: req.body.justification,
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getPendingRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await VIPRejectionService.getPendingRequests();
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllVIPRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await VIPRejectionService.getAllRequests({
      status: req.query.status as string,
    });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getVIPRequestById = async (req: AuthRequest, res: Response) => {
  try {
    const request = await VIPRejectionService.getRequestById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Demande non trouvée' });
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
