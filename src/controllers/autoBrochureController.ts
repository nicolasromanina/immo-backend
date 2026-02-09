import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { AutoBrochureGeneratorService } from '../services/AutoBrochureGeneratorService';
import Project from '../models/Project';
import Promoteur from '../models/Promoteur';

/**
 * Controller for automatic brochure generation
 */

// Generate full brochure for a project
export const generateBrochure = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const { language, includePricing, includeUpdates, includeDocuments, template } = req.query;

    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Generate brochure
    const brochure = await AutoBrochureGeneratorService.generateBrochure(projectId, {
      language: (language as 'fr' | 'en') || 'fr',
      includePricing: includePricing !== 'false',
      includeUpdates: includeUpdates === 'true',
      includeDocuments: includeDocuments === 'true',
      template: (template as 'standard' | 'premium' | 'minimal') || 'standard',
    });

    res.json({
      success: true,
      data: brochure,
    });
  } catch (error) {
    next(error);
  }
};

// Generate social media post
export const generateSocialPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const { platform, language } = req.query;

    if (!platform || !['linkedin', 'facebook', 'twitter', 'instagram'].includes(platform as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform. Must be one of: linkedin, facebook, twitter, instagram',
      });
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const post = await AutoBrochureGeneratorService.generateSocialPost(
      projectId,
      platform as 'linkedin' | 'facebook' | 'twitter' | 'instagram',
      (language as 'fr' | 'en') || 'fr'
    );

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

// Generate project summary
export const generateSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const { maxLength, language } = req.query;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const summary = await AutoBrochureGeneratorService.generateProjectSummary(
      projectId,
      maxLength ? parseInt(maxLength as string) : 200,
      (language as 'fr' | 'en') || 'fr'
    );

    res.json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    next(error);
  }
};

// Generate brochure for promoteur's project (protected)
export const generatePromoteurBrochure = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const { language, includePricing, includeUpdates, includeDocuments, template } = req.body;

    // Check if project exists and belongs to this promoteur
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const userPromoteur = await Promoteur.findOne({ user: req.user!.id });
    if (!userPromoteur || project.promoteur.toString() !== userPromoteur._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to generate brochure for this project',
      });
    }

    // Generate brochure
    const brochure = await AutoBrochureGeneratorService.generateBrochure(projectId, {
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
  } catch (error) {
    next(error);
  }
};

// Bulk generate brochures for multiple projects
export const bulkGenerateBrochures = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
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

    const results = await Promise.allSettled(
      projectIds.map(id =>
        AutoBrochureGeneratorService.generateBrochure(id, {
          language: language || 'fr',
          template: template || 'minimal',
        })
      )
    );

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
  } catch (error) {
    next(error);
  }
};
