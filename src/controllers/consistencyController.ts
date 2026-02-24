import { Response } from 'express';
import { ConsistencyScoreService } from '../services/ConsistencyScoreService';
import { AuthRequest } from '../middlewares/auth';
import Project from '../models/Project';
import { Role } from '../config/roles';

const hasPrivilegedAccess = (roles: Role[] = []) =>
  roles.includes(Role.ADMIN) || roles.includes(Role.MANAGER);

export const getProjectConsistency = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    if (!hasPrivilegedAccess(req.user.roles)) {
      const promoteurProfileId = req.user.promoteurProfile?.toString?.();
      if (!promoteurProfileId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const project = await Project.findById(req.params.projectId).select('promoteur');
      if (!project) {
        return res.status(404).json({ message: 'Projet non trouve' });
      }
      if (project.promoteur.toString() !== promoteurProfileId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const result = await ConsistencyScoreService.calculateForProject(req.params.projectId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getPromoteurConsistency = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    if (!hasPrivilegedAccess(req.user.roles)) {
      const promoteurProfileId = req.user.promoteurProfile?.toString?.();
      if (!promoteurProfileId || promoteurProfileId !== req.params.promoteurId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

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
