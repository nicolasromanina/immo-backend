import { NextFunction, Response } from 'express';
import Promoteur from '../models/Promoteur';
import TeamRole from '../models/TeamRole';
import { AuthRequest } from './auth';

type TeamPermission =
  | 'viewLeads'
  | 'editLeads'
  | 'assignLeads'
  | 'deleteLeads'
  | 'exportLeads'
  | 'viewProjects'
  | 'editProjects'
  | 'createProjects'
  | 'deleteProjects'
  | 'viewTeam'
  | 'editTeam'
  | 'addTeamMembers'
  | 'removeTeamMembers'
  | 'changeRoles'
  | 'viewReports'
  | 'viewAnalytics'
  | 'exportReports'
  | 'editSettings'
  | 'viewAuditLogs'
  | 'manageBilling';

type TeamContext = {
  promoteurId: string;
  isOwner: boolean;
  teamRole: 'admin' | 'commercial' | 'technique' | null;
};

const DEFAULT_ROLE_PERMISSIONS: Record<'admin' | 'commercial' | 'technique', Record<TeamPermission, boolean>> = {
  admin: {
    viewLeads: true,
    editLeads: true,
    assignLeads: true,
    deleteLeads: true,
    exportLeads: true,
    viewProjects: true,
    editProjects: true,
    createProjects: true,
    deleteProjects: true,
    viewTeam: true,
    editTeam: true,
    addTeamMembers: true,
    removeTeamMembers: true,
    changeRoles: true,
    viewReports: true,
    viewAnalytics: true,
    exportReports: true,
    editSettings: true,
    viewAuditLogs: true,
    manageBilling: true,
  },
  commercial: {
    viewLeads: true,
    editLeads: true,
    assignLeads: true,
    deleteLeads: false,
    exportLeads: false,
    viewProjects: true,
    editProjects: false,
    createProjects: false,
    deleteProjects: false,
    viewTeam: true,
    editTeam: false,
    addTeamMembers: false,
    removeTeamMembers: false,
    changeRoles: false,
    viewReports: true,
    viewAnalytics: false,
    exportReports: false,
    editSettings: false,
    viewAuditLogs: false,
    manageBilling: false,
  },
  technique: {
    viewLeads: true,
    editLeads: false,
    assignLeads: false,
    deleteLeads: false,
    exportLeads: false,
    viewProjects: true,
    editProjects: true,
    createProjects: false,
    deleteProjects: false,
    viewTeam: true,
    editTeam: false,
    addTeamMembers: false,
    removeTeamMembers: false,
    changeRoles: false,
    viewReports: true,
    viewAnalytics: false,
    exportReports: false,
    editSettings: false,
    viewAuditLogs: false,
    manageBilling: false,
  },
};

const getCachedTeamContext = (req: AuthRequest): TeamContext | undefined => {
  return (req as any).__teamContext as TeamContext | undefined;
};

const setCachedTeamContext = (req: AuthRequest, context: TeamContext | null) => {
  (req as any).__teamContext = context;
};

const resolveTeamContext = async (req: AuthRequest): Promise<TeamContext | null> => {
  const cached = getCachedTeamContext(req);
  if (cached) {
    return cached;
  }

  if (!req.user?.id) {
    return null;
  }

  const userId = req.user.id;
  const promoteurIdFromToken = req.user.promoteurProfile?.toString?.() || req.user.promoteurProfile;

  let promoteur = null as any;
  if (promoteurIdFromToken) {
    promoteur = await Promoteur.findById(promoteurIdFromToken).select('_id user teamMembers');
  }
  if (!promoteur) {
    promoteur = await Promoteur.findOne({ user: userId }).select('_id user teamMembers');
  }
  if (!promoteur) {
    setCachedTeamContext(req, null);
    return null;
  }

  const isOwner = promoteur.user.toString() === userId;
  const teamMember = promoteur.teamMembers.find((m: any) => m.userId.toString() === userId);

  if (!isOwner && !teamMember) {
    setCachedTeamContext(req, null);
    return null;
  }

  const context: TeamContext = {
    promoteurId: promoteur._id.toString(),
    isOwner,
    teamRole: isOwner ? 'admin' : (teamMember?.role || null),
  };
  setCachedTeamContext(req, context);
  return context;
};

const hasTeamPermission = async (promoteurId: string, role: 'admin' | 'commercial' | 'technique', permission: TeamPermission) => {
  if (role === 'admin') {
    return true;
  }

  const customRole = await TeamRole.findOne({ promoteur: promoteurId, name: role }).select('permissions');
  if (customRole?.permissions && typeof customRole.permissions[permission] === 'boolean') {
    return !!customRole.permissions[permission];
  }

  return !!DEFAULT_ROLE_PERMISSIONS[role][permission];
};

export const requirePromoteurAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const context = await resolveTeamContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Promoteur access required' });
    }
    req.user = {
      ...req.user!,
      promoteurProfile: context.promoteurId,
    };
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Unable to resolve promoteur access' });
  }
};

export const requirePromoteurPermission = (permission: TeamPermission) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const context = await resolveTeamContext(req);
      if (!context) {
        return res.status(403).json({ message: 'Promoteur access required' });
      }

      if (context.isOwner) {
        req.user = {
          ...req.user!,
          promoteurProfile: context.promoteurId,
        };
        return next();
      }

      const role = context.teamRole;
      if (!role) {
        return res.status(403).json({ message: 'Team role not found' });
      }

      const allowed = await hasTeamPermission(context.promoteurId, role, permission);
      if (!allowed) {
        return res.status(403).json({ message: `Missing permission: ${permission}` });
      }

      req.user = {
        ...req.user!,
        promoteurProfile: context.promoteurId,
      };
      return next();
    } catch (error) {
      return res.status(500).json({ message: 'Unable to resolve team permissions' });
    }
  };
};

