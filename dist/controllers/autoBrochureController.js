"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkGenerateBrochures = exports.generatePromoteurBrochure = exports.generateSummary = exports.generateSocialPost = exports.generateBrochure = void 0;
const AutoBrochureGeneratorService_1 = require("../services/AutoBrochureGeneratorService");
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
/**
 * Controller for automatic brochure generation
 */
// Generate full brochure for a project
const generateBrochure = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { language, includePricing, includeUpdates, includeDocuments, template } = req.query;
        // Check if project exists and user has access
        const project = await Project_1.default.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found',
            });
        }
        // Generate brochure
        const brochure = await AutoBrochureGeneratorService_1.AutoBrochureGeneratorService.generateBrochure(projectId, {
            language: language || 'fr',
            includePricing: includePricing !== 'false',
            includeUpdates: includeUpdates === 'true',
            includeDocuments: includeDocuments === 'true',
            template: template || 'standard',
        });
        res.json({
            success: true,
            data: brochure,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.generateBrochure = generateBrochure;
// Generate social media post
const generateSocialPost = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { platform, language } = req.query;
        if (!platform || !['linkedin', 'facebook', 'twitter', 'instagram'].includes(platform)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid platform. Must be one of: linkedin, facebook, twitter, instagram',
            });
        }
        // Check if project exists
        const project = await Project_1.default.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found',
            });
        }
        const post = await AutoBrochureGeneratorService_1.AutoBrochureGeneratorService.generateSocialPost(projectId, platform, language || 'fr');
        res.json({
            success: true,
            data: post,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.generateSocialPost = generateSocialPost;
// Generate project summary
const generateSummary = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { maxLength, language } = req.query;
        // Check if project exists
        const project = await Project_1.default.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found',
            });
        }
        const summary = await AutoBrochureGeneratorService_1.AutoBrochureGeneratorService.generateProjectSummary(projectId, maxLength ? parseInt(maxLength) : 200, language || 'fr');
        res.json({
            success: true,
            data: { summary },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.generateSummary = generateSummary;
// Generate brochure for promoteur's project (protected)
const generatePromoteurBrochure = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { language, includePricing, includeUpdates, includeDocuments, template } = req.body;
        // Check if project exists and belongs to this promoteur
        const project = await Project_1.default.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found',
            });
        }
        const userPromoteur = await Promoteur_1.default.findOne({ user: req.user.id });
        if (!userPromoteur || project.promoteur.toString() !== userPromoteur._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to generate brochure for this project',
            });
        }
        // Generate brochure
        const brochure = await AutoBrochureGeneratorService_1.AutoBrochureGeneratorService.generateBrochure(projectId, {
            language: language || 'fr',
            includePricing: includePricing !== false,
            includeUpdates: includeUpdates || false,
            includeDocuments: includeDocuments || false,
            template: template || 'standard',
        });
        res.json({
            success: true,
            data: brochure,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.generatePromoteurBrochure = generatePromoteurBrochure;
// Bulk generate brochures for multiple projects
const bulkGenerateBrochures = async (req, res, next) => {
    try {
        const { projectIds, language, template } = req.body;
        if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'projectIds array is required',
            });
        }
        if (projectIds.length > 10) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 10 projects per batch',
            });
        }
        const results = await Promise.allSettled(projectIds.map(id => AutoBrochureGeneratorService_1.AutoBrochureGeneratorService.generateBrochure(id, {
            language: language || 'fr',
            template: template || 'minimal',
        })));
        const brochures = results.map((result, index) => ({
            projectId: projectIds[index],
            success: result.status === 'fulfilled',
            brochure: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason?.message : null,
        }));
        res.json({
            success: true,
            data: {
                total: projectIds.length,
                successful: brochures.filter(b => b.success).length,
                failed: brochures.filter(b => !b.success).length,
                brochures,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.bulkGenerateBrochures = bulkGenerateBrochures;
