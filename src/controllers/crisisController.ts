import { Request, Response } from 'express';
import { CrisisService } from '../services/CrisisService';
import { AuthRequest } from '../middlewares/auth';

export const declareCrisis = async (req: AuthRequest, res: Response) => {
  try {
    const crisis = await CrisisService.declareCrisis({
      ...req.body,
      detectedBy: req.user!.id,
    });
    res.status(201).json(crisis);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateCrisisStatus = async (req: AuthRequest, res: Response) => {
  try {
    const crisis = await CrisisService.updateStatus(
      req.params.id,
      req.body.status,
      req.user!.id,
      req.body.notes
    );
    if (!crisis) return res.status(404).json({ message: 'Crise non trouvée' });
    res.json(crisis);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const assignCrisis = async (req: AuthRequest, res: Response) => {
  try {
    const crisis = await CrisisService.assignCrisis(
      req.params.id,
      req.body.assigneeId,
      req.user!.id
    );
    if (!crisis) return res.status(404).json({ message: 'Crise non trouvée' });
    res.json(crisis);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const sendCrisisCommunication = async (req: AuthRequest, res: Response) => {
  try {
    const crisis = await CrisisService.sendCrisisCommunication(req.params.id, {
      ...req.body,
      sentBy: req.user!.id,
    });
    res.json(crisis);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const resolveCrisis = async (req: AuthRequest, res: Response) => {
  try {
    const crisis = await CrisisService.resolveCrisis(
      req.params.id,
      req.user!.id,
      req.body.summary
    );
    if (!crisis) return res.status(404).json({ message: 'Crise non trouvée' });
    res.json(crisis);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getActiveCrises = async (req: AuthRequest, res: Response) => {
  try {
    const crises = await CrisisService.getActiveCrises();
    res.json(crises);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllCrises = async (req: AuthRequest, res: Response) => {
  try {
    const result = await CrisisService.getAllCrises({
      status: req.query.status as string,
      type: req.query.type as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCrisisById = async (req: AuthRequest, res: Response) => {
  try {
    const crisis = await CrisisService.getCrisisById(req.params.id);
    if (!crisis) return res.status(404).json({ message: 'Crise non trouvée' });
    res.json(crisis);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
