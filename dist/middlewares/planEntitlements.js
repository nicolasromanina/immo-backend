"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTeamMemberQuota = exports.requireMediaQuota = exports.requireDocumentQuota = exports.requireUpdateQuota = exports.requireProjectQuota = exports.requirePlanCapability = void 0;
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const PlanLimitService_1 = require("../services/PlanLimitService");
const isAdminOrManager = (req) => {
    const roles = req.user?.roles || [];
    return roles.includes('admin') || roles.includes('manager');
};
const resolvePromoteurId = async (req) => {
    const fromToken = req.user?.promoteurProfile?.toString?.() || req.user?.promoteurProfile;
    if (fromToken)
        return String(fromToken);
    if (!req.user?.id)
        return null;
    const promoteur = await Promoteur_1.default.findOne({ user: req.user.id }).select('_id');
    return promoteur?._id?.toString() || null;
};
const requirePlanCapability = (capability) => {
    return async (req, res, next) => {
        try {
            if (isAdminOrManager(req))
                return next();
            const promoteurId = await resolvePromoteurId(req);
            if (!promoteurId) {
                return res.status(403).json({ message: 'Promoteur access required' });
            }
            const enabled = await PlanLimitService_1.PlanLimitService.checkCapability(promoteurId, capability);
            if (!enabled) {
                return res.status(403).json({
                    message: `Cette fonctionnalite (${capability}) n est pas disponible sur votre plan`,
                    capability,
                    upgrade: true,
                });
            }
            return next();
        }
        catch (error) {
            return res.status(500).json({ message: 'Unable to evaluate plan entitlements' });
        }
    };
};
exports.requirePlanCapability = requirePlanCapability;
// ---------------------------------------------------------------------------
// Quota middlewares
// ---------------------------------------------------------------------------
const requireProjectQuota = () => async (req, res, next) => {
    try {
        if (isAdminOrManager(req))
            return next();
        const promoteurId = await resolvePromoteurId(req);
        if (!promoteurId)
            return res.status(403).json({ message: 'Promoteur access required' });
        const allowed = await PlanLimitService_1.PlanLimitService.checkProjectLimit(promoteurId);
        if (!allowed)
            return res.status(403).json({ message: 'Limite de projets atteinte pour votre plan', quota: 'maxProjects', upgrade: true });
        return next();
    }
    catch {
        return res.status(500).json({ message: 'Unable to evaluate plan quota' });
    }
};
exports.requireProjectQuota = requireProjectQuota;
const requireUpdateQuota = () => async (req, res, next) => {
    try {
        if (isAdminOrManager(req))
            return next();
        const promoteurId = await resolvePromoteurId(req);
        if (!promoteurId)
            return res.status(403).json({ message: 'Promoteur access required' });
        const { allowed, limit, current } = await PlanLimitService_1.PlanLimitService.checkMonthlyUpdateLimit(promoteurId);
        if (!allowed)
            return res.status(403).json({ message: 'Limite de mises à jour mensuelle atteinte pour votre plan', quota: 'maxUpdatesPerMonth', upgrade: true, current, limit });
        return next();
    }
    catch {
        return res.status(500).json({ message: 'Unable to evaluate plan quota' });
    }
};
exports.requireUpdateQuota = requireUpdateQuota;
const requireDocumentQuota = () => async (req, res, next) => {
    try {
        if (isAdminOrManager(req))
            return next();
        const promoteurId = await resolvePromoteurId(req);
        if (!promoteurId)
            return res.status(403).json({ message: 'Promoteur access required' });
        const projectId = req.body?.projectId || req.params?.id;
        if (!projectId)
            return res.status(400).json({ message: 'projectId requis pour vérifier le quota de documents' });
        const { allowed, limit, current } = await PlanLimitService_1.PlanLimitService.checkProjectDocumentLimit(promoteurId, projectId);
        if (!allowed)
            return res.status(403).json({ message: 'Limite de documents atteinte pour ce projet', quota: 'maxDocuments', upgrade: true, current, limit });
        return next();
    }
    catch {
        return res.status(500).json({ message: 'Unable to evaluate plan quota' });
    }
};
exports.requireDocumentQuota = requireDocumentQuota;
const requireMediaQuota = () => async (req, res, next) => {
    try {
        if (isAdminOrManager(req))
            return next();
        const promoteurId = await resolvePromoteurId(req);
        if (!promoteurId)
            return res.status(403).json({ message: 'Promoteur access required' });
        const projectId = req.params?.id;
        const mediaType = req.params?.mediaType;
        if (!projectId || !mediaType)
            return next();
        const { allowed, limit, current } = await PlanLimitService_1.PlanLimitService.checkProjectMediaLimit(promoteurId, projectId, mediaType);
        if (!allowed)
            return res.status(403).json({ message: `Limite de médias (${mediaType}) atteinte pour ce projet`, quota: mediaType === 'videos' ? 'maxVideos' : 'maxMediaPerProject', upgrade: true, current, limit });
        return next();
    }
    catch {
        return res.status(500).json({ message: 'Unable to evaluate plan quota' });
    }
};
exports.requireMediaQuota = requireMediaQuota;
const requireTeamMemberQuota = () => async (req, res, next) => {
    try {
        if (isAdminOrManager(req))
            return next();
        const promoteurId = await resolvePromoteurId(req);
        if (!promoteurId)
            return res.status(403).json({ message: 'Promoteur access required' });
        const allowed = await PlanLimitService_1.PlanLimitService.checkTeamMemberLimit(promoteurId);
        if (!allowed)
            return res.status(403).json({ message: "Limite de membres d'équipe atteinte pour votre plan", quota: 'maxTeamMembers', upgrade: true });
        return next();
    }
    catch {
        return res.status(500).json({ message: 'Unable to evaluate plan quota' });
    }
};
exports.requireTeamMemberQuota = requireTeamMemberQuota;
