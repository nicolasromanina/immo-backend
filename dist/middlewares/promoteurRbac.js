"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePromoteurPermission = exports.requirePromoteurAccess = void 0;
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const TeamRole_1 = __importDefault(require("../models/TeamRole"));
const DEFAULT_ROLE_PERMISSIONS = {
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
const getCachedTeamContext = (req) => {
    return req.__teamContext;
};
const setCachedTeamContext = (req, context) => {
    req.__teamContext = context;
};
const resolveTeamContext = async (req) => {
    const cached = getCachedTeamContext(req);
    if (cached) {
        return cached;
    }
    if (!req.user?.id) {
        return null;
    }
    const userId = req.user.id;
    const promoteurIdFromToken = req.user.promoteurProfile?.toString?.() || req.user.promoteurProfile;
    let promoteur = null;
    if (promoteurIdFromToken) {
        promoteur = await Promoteur_1.default.findById(promoteurIdFromToken).select('_id user teamMembers');
    }
    if (!promoteur) {
        promoteur = await Promoteur_1.default.findOne({ user: userId }).select('_id user teamMembers');
    }
    if (!promoteur) {
        setCachedTeamContext(req, null);
        return null;
    }
    const isOwner = promoteur.user.toString() === userId;
    const teamMember = promoteur.teamMembers.find((m) => m.userId.toString() === userId);
    if (!isOwner && !teamMember) {
        setCachedTeamContext(req, null);
        return null;
    }
    const context = {
        promoteurId: promoteur._id.toString(),
        isOwner,
        teamRole: isOwner ? 'admin' : (teamMember?.role || null),
    };
    setCachedTeamContext(req, context);
    return context;
};
const hasTeamPermission = async (promoteurId, role, permission) => {
    if (role === 'admin') {
        return true;
    }
    const customRole = await TeamRole_1.default.findOne({ promoteur: promoteurId, name: role }).select('permissions');
    if (customRole?.permissions && typeof customRole.permissions[permission] === 'boolean') {
        return !!customRole.permissions[permission];
    }
    return !!DEFAULT_ROLE_PERMISSIONS[role][permission];
};
const requirePromoteurAccess = async (req, res, next) => {
    try {
        const context = await resolveTeamContext(req);
        if (!context) {
            return res.status(403).json({ message: 'Promoteur access required' });
        }
        req.user = {
            ...req.user,
            promoteurProfile: context.promoteurId,
        };
        return next();
    }
    catch (error) {
        return res.status(500).json({ message: 'Unable to resolve promoteur access' });
    }
};
exports.requirePromoteurAccess = requirePromoteurAccess;
const requirePromoteurPermission = (permission) => {
    return async (req, res, next) => {
        try {
            const context = await resolveTeamContext(req);
            if (!context) {
                return res.status(403).json({ message: 'Promoteur access required' });
            }
            if (context.isOwner) {
                req.user = {
                    ...req.user,
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
                ...req.user,
                promoteurProfile: context.promoteurId,
            };
            return next();
        }
        catch (error) {
            return res.status(500).json({ message: 'Unable to resolve team permissions' });
        }
    };
};
exports.requirePromoteurPermission = requirePromoteurPermission;
