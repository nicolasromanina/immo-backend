import { Request, Response } from 'express';
import { ConsistencyScoreService } from '../services/ConsistencyScoreService';
import { AuthRequest } from '../middlewares/auth';

export const getProjectConsistency = async (req: Request, res: Response) => {
  try {
    const result = await ConsistencyScoreService.calculateForProject(req.params.projectId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getPromoteurConsistency = async (req: Request, res: Response) => {
  try {
    const result = await ConsistencyScoreService.calculateForPromoteur(req.params.promoteurId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getFlaggedProjects = async (req: AuthRequest, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 50;
    const flagged = await ConsistencyScoreService.getFlaggedProjects(threshold);
    res.json(flagged);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
