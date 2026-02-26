import { NextFunction, Response } from 'express';
import Promoteur from '../models/Promoteur';
import { PlanCapability } from '../config/planLimits';
import { PlanLimitService } from '../services/PlanLimitService';
import { AuthRequest } from './auth';

const isAdminOrManager = (req: AuthRequest): boolean => {
  const roles = req.user?.roles || [];
  return roles.includes('admin' as any) || roles.includes('manager' as any);
};

const resolvePromoteurId = async (req: AuthRequest): Promise<string | null> => {
  const fromToken = req.user?.promoteurProfile?.toString?.() || req.user?.promoteurProfile;
  if (fromToken) return String(fromToken);

  if (!req.user?.id) return null;
  const promoteur = await Promoteur.findOne({ user: req.user.id }).select('_id');
  return promoteur?._id?.toString() || null;
};

export const requirePlanCapability = (capability: PlanCapability) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (isAdminOrManager(req)) return next();

      const promoteurId = await resolvePromoteurId(req);
      if (!promoteurId) {
        return res.status(403).json({ message: 'Promoteur access required' });
      }

      const enabled = await PlanLimitService.checkCapability(promoteurId, capability);
      if (!enabled) {
        return res.status(403).json({
          message: `Cette fonctionnalite (${capability}) n est pas disponible sur votre plan`,
          capability,
          upgrade: true,
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({ message: 'Unable to evaluate plan entitlements' });
    }
  };
};

// ---------------------------------------------------------------------------
// Quota middlewares
// ---------------------------------------------------------------------------

export const requireProjectQuota = () => async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (isAdminOrManager(req)) return next();
    const promoteurId = await resolvePromoteurId(req);
    if (!promoteurId) return res.status(403).json({ message: 'Promoteur access required' });
    const allowed = await PlanLimitService.checkProjectLimit(promoteurId);
    if (!allowed) return res.status(403).json({ message: 'Limite de projets atteinte pour votre plan', quota: 'maxProjects', upgrade: true });
    return next();
  } catch {
    return res.status(500).json({ message: 'Unable to evaluate plan quota' });
  }
};

export const requireUpdateQuota = () => async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (isAdminOrManager(req)) return next();
    const promoteurId = await resolvePromoteurId(req);
    if (!promoteurId) return res.status(403).json({ message: 'Promoteur access required' });
    const { allowed, limit, current } = await PlanLimitService.checkMonthlyUpdateLimit(promoteurId);
    if (!allowed) return res.status(403).json({ message: 'Limite de mises à jour mensuelle atteinte pour votre plan', quota: 'maxUpdatesPerMonth', upgrade: true, current, limit });
    return next();
  } catch {
    return res.status(500).json({ message: 'Unable to evaluate plan quota' });
  }
};

export const requireDocumentQuota = () => async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (isAdminOrManager(req)) return next();
    const promoteurId = await resolvePromoteurId(req);
    if (!promoteurId) return res.status(403).json({ message: 'Promoteur access required' });
    const projectId = req.body?.projectId || req.params?.id;
    if (!projectId) return res.status(400).json({ message: 'projectId requis pour vérifier le quota de documents' });
    const { allowed, limit, current } = await PlanLimitService.checkProjectDocumentLimit(promoteurId, projectId);
    if (!allowed) return res.status(403).json({ message: 'Limite de documents atteinte pour ce projet', quota: 'maxDocuments', upgrade: true, current, limit });
    return next();
  } catch {
    return res.status(500).json({ message: 'Unable to evaluate plan quota' });
  }
};

export const requireMediaQuota = () => async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (isAdminOrManager(req)) return next();
    const promoteurId = await resolvePromoteurId(req);
    if (!promoteurId) return res.status(403).json({ message: 'Promoteur access required' });
    const projectId = req.params?.id;
    const mediaType = req.params?.mediaType as 'renderings' | 'photos' | 'videos' | 'floorPlans';
    if (!projectId || !mediaType) return next();
    const { allowed, limit, current } = await PlanLimitService.checkProjectMediaLimit(promoteurId, projectId, mediaType);
    if (!allowed) return res.status(403).json({ message: `Limite de médias (${mediaType}) atteinte pour ce projet`, quota: mediaType === 'videos' ? 'maxVideos' : 'maxMediaPerProject', upgrade: true, current, limit });
    return next();
  } catch {
    return res.status(500).json({ message: 'Unable to evaluate plan quota' });
  }
};

export const requireTeamMemberQuota = () => async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (isAdminOrManager(req)) return next();
    const promoteurId = await resolvePromoteurId(req);
    if (!promoteurId) return res.status(403).json({ message: 'Promoteur access required' });
    const allowed = await PlanLimitService.checkTeamMemberLimit(promoteurId);
    if (!allowed) return res.status(403).json({ message: "Limite de membres d'équipe atteinte pour votre plan", quota: 'maxTeamMembers', upgrade: true });
    return next();
  } catch {
    return res.status(500).json({ message: 'Unable to evaluate plan quota' });
  }
};
