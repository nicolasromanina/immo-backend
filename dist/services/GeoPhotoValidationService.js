"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoPhotoValidationService = void 0;
const Project_1 = __importDefault(require("../models/Project"));
const Update_1 = __importDefault(require("../models/Update"));
const AuditLogService_1 = require("./AuditLogService");
/**
 * Service for validating geolocated photos from construction sites
 * Ensures photos are taken at the correct location and time
 */
class GeoPhotoValidationService {
    /**
     * Calculate distance between two GPS coordinates using Haversine formula
     */
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in meters
    }
    /**
     * Validate a single geolocated photo against project location
     */
    static async validatePhoto(photo, projectId) {
        const project = await Project_1.default.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }
        const issues = [];
        let score = 0;
        let distanceFromProject = null;
        let timestampValid = false;
        let geoMatch = false;
        // 1. Validate timestamp (photo should be recent)
        const photoAge = (Date.now() - new Date(photo.capturedAt).getTime()) / (1000 * 60 * 60);
        if (photoAge <= this.MAX_AGE_HOURS) {
            timestampValid = true;
            score += 30;
        }
        else {
            issues.push(`Photo trop ancienne: ${Math.round(photoAge)} heures`);
        }
        // 2. Validate geolocation if project has coordinates
        if (project.coordinates && photo.geolocation) {
            distanceFromProject = this.calculateDistance(photo.geolocation.latitude, photo.geolocation.longitude, project.coordinates.lat, project.coordinates.lng);
            if (distanceFromProject <= this.MAX_DISTANCE_METERS) {
                geoMatch = true;
                // Score based on distance (closer = higher score)
                const distanceScore = Math.max(0, 50 - (distanceFromProject / this.MAX_DISTANCE_METERS) * 50);
                score += distanceScore;
            }
            else {
                issues.push(`Photo prise à ${Math.round(distanceFromProject)}m du chantier (max: ${this.MAX_DISTANCE_METERS}m)`);
            }
            // Bonus for GPS accuracy
            if (photo.geolocation.accuracy && photo.geolocation.accuracy < 50) {
                score += 10;
            }
        }
        else if (!photo.geolocation) {
            issues.push('Données de géolocalisation manquantes');
        }
        else if (!project.coordinates) {
            // No project coordinates to validate against, give benefit of doubt
            score += 30;
            issues.push('Coordonnées du projet non définies - validation partielle');
        }
        // 3. Device info bonus
        if (photo.deviceInfo?.deviceId) {
            score += 10;
        }
        const valid = score >= 60 && timestampValid;
        return {
            valid,
            score: Math.min(100, Math.round(score)),
            details: {
                distanceFromProject,
                timestampValid,
                geoMatch,
                issues,
            },
        };
    }
    /**
     * Validate all photos in an update
     */
    static async validateUpdatePhotos(updateId) {
        const update = await Update_1.default.findById(updateId);
        if (!update) {
            throw new Error('Update not found');
        }
        if (!update.geolocatedPhotos || update.geolocatedPhotos.length === 0) {
            return {
                overallValid: false,
                averageScore: 0,
                photos: [],
            };
        }
        const results = await Promise.all(update.geolocatedPhotos.map(async (photo) => {
            const validation = await this.validatePhoto(photo, update.project.toString());
            return {
                url: photo.url,
                valid: validation.valid,
                score: validation.score,
                issues: validation.details.issues,
            };
        }));
        const validCount = results.filter((r) => r.valid).length;
        const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
        // Update is valid if at least 2 out of 3 photos are valid
        const overallValid = validCount >= 2;
        return {
            overallValid,
            averageScore: Math.round(averageScore),
            photos: results,
        };
    }
    /**
     * Process and verify geolocated photos for an update
     */
    static async processGeolocatedPhotos(updateId, photos, userId) {
        const update = await Update_1.default.findById(updateId);
        if (!update) {
            throw new Error('Update not found');
        }
        const processedPhotos = [];
        for (const photo of photos) {
            const validation = await this.validatePhoto(photo, update.project.toString());
            processedPhotos.push({
                ...photo,
                uploadedAt: new Date(),
                verified: validation.valid,
                verificationScore: validation.score,
                verificationDetails: {
                    distanceFromProject: validation.details.distanceFromProject ?? undefined,
                    timestampValid: validation.details.timestampValid,
                    geoMatch: validation.details.geoMatch,
                },
            });
        }
        // Update the document
        update.geolocatedPhotos = processedPhotos;
        // Also update legacy photos array with URLs for backward compatibility
        update.photos = processedPhotos.slice(0, 3).map((p) => p.url);
        await update.save();
        // Log the verification
        await AuditLogService_1.AuditLogService.log({
            actor: userId,
            actorRole: 'promoteur',
            action: 'verify_geolocated_photos',
            category: 'project',
            description: `Verified ${photos.length} geolocated photos for update`,
            targetType: 'Update',
            targetId: updateId,
            metadata: {
                photosCount: photos.length,
                verifiedCount: processedPhotos.filter((p) => p.verified).length,
                averageScore: Math.round(processedPhotos.reduce((sum, p) => sum + (p.verificationScore || 0), 0) /
                    processedPhotos.length),
            },
            success: true,
        });
        return processedPhotos;
    }
    /**
     * Check for anomalies in photo submissions (anti-fraud)
     */
    static async detectPhotoAnomalies(promoteurId) {
        // Get recent updates from this promoteur
        const recentUpdates = await Update_1.default.find({
            promoteur: promoteurId,
            status: 'published',
            publishedAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
        }).sort({ publishedAt: -1 }).limit(50);
        const anomalies = [];
        // Check for repeated images (same URL across different updates)
        const photoUrls = new Map();
        for (const update of recentUpdates) {
            const allUrls = [
                ...update.photos,
                ...(update.geolocatedPhotos?.map((p) => p.url) || []),
            ];
            for (const url of allUrls) {
                if (!photoUrls.has(url)) {
                    photoUrls.set(url, []);
                }
                photoUrls.get(url).push(update._id.toString());
            }
        }
        for (const [url, updateIds] of photoUrls) {
            if (updateIds.length > 1) {
                anomalies.push({
                    type: 'repeated_image',
                    description: `Même image utilisée dans ${updateIds.length} updates différents`,
                    updateIds,
                });
            }
        }
        // Check for suspicious timing (too many updates in short period)
        const updatesByDay = new Map();
        for (const update of recentUpdates) {
            if (update.publishedAt) {
                const day = update.publishedAt.toISOString().split('T')[0];
                if (!updatesByDay.has(day)) {
                    updatesByDay.set(day, []);
                }
                updatesByDay.get(day).push(update._id.toString());
            }
        }
        for (const [day, updateIds] of updatesByDay) {
            if (updateIds.length > 3) {
                anomalies.push({
                    type: 'suspicious_timing',
                    description: `${updateIds.length} updates publiés le même jour (${day})`,
                    updateIds,
                });
            }
        }
        return {
            hasAnomalies: anomalies.length > 0,
            anomalies,
        };
    }
    /**
     * Generate verification report for admin review
     */
    static async generateVerificationReport(projectId) {
        const project = await Project_1.default.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }
        const updates = await Update_1.default.find({
            project: projectId,
            status: 'published',
        }).sort({ publishedAt: -1 }).limit(20);
        const updateReports = [];
        let totalScore = 0;
        let scoreCount = 0;
        const allIssues = [];
        for (const update of updates) {
            if (update.geolocatedPhotos && update.geolocatedPhotos.length > 0) {
                const verifiedCount = update.geolocatedPhotos.filter((p) => p.verified).length;
                const avgScore = update.geolocatedPhotos.reduce((sum, p) => sum + (p.verificationScore || 0), 0) /
                    update.geolocatedPhotos.length;
                const issues = update.geolocatedPhotos
                    .flatMap((p) => {
                    const details = p.verificationDetails;
                    const photoIssues = [];
                    if (details && !details.timestampValid) {
                        photoIssues.push('Horodatage invalide');
                    }
                    if (details && !details.geoMatch && details.distanceFromProject) {
                        photoIssues.push(`Distance: ${Math.round(details.distanceFromProject)}m`);
                    }
                    return photoIssues;
                });
                updateReports.push({
                    updateId: update._id.toString(),
                    title: update.title,
                    publishedAt: update.publishedAt || null,
                    photosVerified: verifiedCount,
                    photosTotal: update.geolocatedPhotos.length,
                    averageScore: Math.round(avgScore),
                    issues,
                });
                totalScore += avgScore;
                scoreCount++;
                allIssues.push(...issues);
            }
            else {
                updateReports.push({
                    updateId: update._id.toString(),
                    title: update.title,
                    publishedAt: update.publishedAt || null,
                    photosVerified: 0,
                    photosTotal: update.photos.length,
                    averageScore: 0,
                    issues: ['Photos non géolocalisées'],
                });
            }
        }
        const overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
        // Generate recommendations
        const recommendations = [];
        if (overallScore < 50) {
            recommendations.push('Score de vérification faible - vérifier l\'authenticité des photos');
        }
        if (!project.coordinates) {
            recommendations.push('Ajouter les coordonnées GPS du projet pour améliorer la vérification');
        }
        if (allIssues.includes('Horodatage invalide')) {
            recommendations.push('Demander des photos plus récentes');
        }
        return {
            project: {
                id: project._id.toString(),
                title: project.title,
                coordinates: project.coordinates || null,
            },
            updates: updateReports,
            overallScore,
            recommendations,
        };
    }
}
exports.GeoPhotoValidationService = GeoPhotoValidationService;
// Maximum acceptable distance from project coordinates (in meters)
GeoPhotoValidationService.MAX_DISTANCE_METERS = 500;
// Maximum acceptable time difference for "recent" photos (in hours)
GeoPhotoValidationService.MAX_AGE_HOURS = 72;
