"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlaggedProjects = exports.getPromoteurConsistency = exports.getProjectConsistency = void 0;
const ConsistencyScoreService_1 = require("../services/ConsistencyScoreService");
const Project_1 = __importDefault(require("../models/Project"));
const roles_1 = require("../config/roles");
const hasPrivilegedAccess = (roles = []) => roles.includes(roles_1.Role.ADMIN) || roles.includes(roles_1.Role.MANAGER);
const getProjectConsistency = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        if (!hasPrivilegedAccess(req.user.roles)) {
            const promoteurProfileId = req.user.promoteurProfile?.toString?.();
            if (!promoteurProfileId) {
                return res.status(403).json({ message: 'Forbidden' });
            }
            const project = await Project_1.default.findById(req.params.projectId).select('promoteur');
            if (!project) {
                return res.status(404).json({ message: 'Projet non trouve' });
            }
            if (project.promoteur.toString() !== promoteurProfileId) {
                return res.status(403).json({ message: 'Forbidden' });
            }
        }
        const result = await ConsistencyScoreService_1.ConsistencyScoreService.calculateForProject(req.params.projectId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getProjectConsistency = getProjectConsistency;
const getPromoteurConsistency = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        if (!hasPrivilegedAccess(req.user.roles)) {
            const promoteurProfileId = req.user.promoteurProfile?.toString?.();
            if (!promoteurProfileId || promoteurProfileId !== req.params.promoteurId) {
                return res.status(403).json({ message: 'Forbidden' });
            }
        }
        const result = await ConsistencyScoreService_1.ConsistencyScoreService.calculateForPromoteur(req.params.promoteurId);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getPromoteurConsistency = getPromoteurConsistency;
const getFlaggedProjects = async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 50;
        const flagged = await ConsistencyScoreService_1.ConsistencyScoreService.getFlaggedProjects(threshold);
        res.json(flagged);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getFlaggedProjects = getFlaggedProjects;
