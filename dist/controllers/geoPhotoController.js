"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpdatesWithIssues = exports.generateVerificationReport = exports.detectAnomalies = exports.processGeolocatedPhotos = exports.validateUpdatePhotos = exports.validatePhoto = void 0;
const GeoPhotoValidationService_1 = require("../services/GeoPhotoValidationService");
const Update_1 = __importDefault(require("../models/Update"));
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
/**
 * Controller for geo-located photo validation
 */
// Validate a photo's geolocation against project location
const validatePhoto = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const photoData = req.body;
        // Check project exists
        const project = await Project_1.default.findById(projectId, 'coordinates area city');
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found',
            });
        }
        const result = await GeoPhotoValidationService_1.GeoPhotoValidationService.validatePhoto(photoData, projectId);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.validatePhoto = validatePhoto;
// Validate all photos in an update
const validateUpdatePhotos = async (req, res, next) => {
    try {
        const { updateId } = req.params;
        // Check update exists
        const update = await Update_1.default.findById(updateId);
        if (!update) {
            return res.status(404).json({
                success: false,
                message: 'Update not found',
            });
        }
        const results = await GeoPhotoValidationService_1.GeoPhotoValidationService.validateUpdatePhotos(updateId);
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
    }
    catch (error) {
        next(error);
    }
};
exports.validateUpdatePhotos = validateUpdatePhotos;
// Process and save geolocated photos for an update
const processGeolocatedPhotos = async (req, res, next) => {
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
        const update = await Update_1.default.findById(updateId).populate('project', 'coordinates promoteur');
        if (!update) {
            return res.status(404).json({
                success: false,
                message: 'Update not found',
            });
        }
        // Check permission - get user's promoteur
        const project = update.project;
        const userPromoteur = await Promoteur_1.default.findOne({ user: req.user.id });
        if (!userPromoteur || project.promoteur.toString() !== userPromoteur._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to modify this update',
            });
        }
        // Process photos
        const processedPhotos = await GeoPhotoValidationService_1.GeoPhotoValidationService.processGeolocatedPhotos(updateId, photos, req.user.id);
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
    }
    catch (error) {
        next(error);
    }
};
exports.processGeolocatedPhotos = processGeolocatedPhotos;
// Detect anomalies in promoteur's photos
const detectAnomalies = async (req, res, next) => {
    try {
        const { promoteurId } = req.params;
        const result = await GeoPhotoValidationService_1.GeoPhotoValidationService.detectPhotoAnomalies(promoteurId);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.detectAnomalies = detectAnomalies;
// Generate verification report for a project
const generateVerificationReport = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        // Check project exists
        const project = await Project_1.default.findById(projectId, 'title area city');
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found',
            });
        }
        const report = await GeoPhotoValidationService_1.GeoPhotoValidationService.generateVerificationReport(projectId);
        res.json({
            success: true,
            data: report,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.generateVerificationReport = generateVerificationReport;
// Admin: Get all updates with verification issues
const getUpdatesWithIssues = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        // Find updates that have geolocated photos with verification issues
        const updates = await Update_1.default.find({
            'geolocatedPhotos.verified': false,
        })
            .populate('project', 'title area city coordinates')
            .populate('promoteur', 'organizationName')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
        const results = await Promise.all(updates.map(async (update) => {
            const project = update.project;
            const promoteur = update.promoteur;
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
        const total = await Update_1.default.countDocuments({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getUpdatesWithIssues = getUpdatesWithIssues;
