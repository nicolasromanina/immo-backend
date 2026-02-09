import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { GeoPhotoValidationService } from '../services/GeoPhotoValidationService';
import Update from '../models/Update';
import Project from '../models/Project';
import Promoteur from '../models/Promoteur';

/**
 * Controller for geo-located photo validation
 */

// Validate a photo's geolocation against project location
export const validatePhoto = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const photoData = req.body;

    // Check project exists
    const project = await Project.findById(projectId, 'coordinates area city');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const result = await GeoPhotoValidationService.validatePhoto(photoData, projectId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Validate all photos in an update
export const validateUpdatePhotos = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { updateId } = req.params;

    // Check update exists
    const update = await Update.findById(updateId);
    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'Update not found',
      });
    }

    const results = await GeoPhotoValidationService.validateUpdatePhotos(updateId);

    res.json({
      success: true,
      data: {
        totalPhotos: results.photos.length,
        validPhotos: results.photos.filter(r => r.valid).length,
        invalidPhotos: results.photos.filter(r => !r.valid).length,
        overallValid: results.overallValid,
        averageScore: results.averageScore,
        photos: results.photos,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Process and save geolocated photos for an update
export const processGeolocatedPhotos = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { updateId } = req.params;
    const { photos } = req.body;

    if (!photos || !Array.isArray(photos)) {
      return res.status(400).json({
        success: false,
        message: 'photos array is required',
      });
    }

    // Get update with project
    const update = await Update.findById(updateId).populate('project', 'coordinates promoteur');
    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'Update not found',
      });
    }

    // Check permission - get user's promoteur
    const project = update.project as any;
    const userPromoteur = await Promoteur.findOne({ user: req.user!.id });
    if (!userPromoteur || project.promoteur.toString() !== userPromoteur._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this update',
      });
    }

    // Process photos
    const processedPhotos = await GeoPhotoValidationService.processGeolocatedPhotos(
      updateId,
      photos,
      req.user!.id
    );

    res.json({
      success: true,
      data: {
        photos: processedPhotos,
        summary: {
          total: processedPhotos.length,
          verified: processedPhotos.filter(p => p.verified).length,
          pending: processedPhotos.filter(p => !p.verified).length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Detect anomalies in promoteur's photos
export const detectAnomalies = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { promoteurId } = req.params;

    const result = await GeoPhotoValidationService.detectPhotoAnomalies(promoteurId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Generate verification report for a project
export const generateVerificationReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;

    // Check project exists
    const project = await Project.findById(projectId, 'title area city');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const report = await GeoPhotoValidationService.generateVerificationReport(projectId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all updates with verification issues
export const getUpdatesWithIssues = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Find updates that have geolocated photos with verification issues
    const updates = await Update.find({
      'geolocatedPhotos.verified': false,
    })
      .populate('project', 'title area city coordinates')
      .populate('promoteur', 'organizationName')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const results = await Promise.all(updates.map(async update => {
      const project = update.project as any;
      const promoteur = update.promoteur as any;

      return {
        updateId: update._id,
        updateTitle: update.title,
        project: {
          id: project._id,
          title: project.title,
          area: project.area,
        },
        promoteur: promoteur?.organizationName || 'Unknown',
        photosWithIssues: update.geolocatedPhotos?.filter(p => !p.verified).length || 0,
        totalPhotos: update.geolocatedPhotos?.length || 0,
        createdAt: update.createdAt,
      };
    }));

    const total = await Update.countDocuments({
      'geolocatedPhotos.verified': false,
    });

    res.json({
      success: true,
      data: {
        updates: results,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
