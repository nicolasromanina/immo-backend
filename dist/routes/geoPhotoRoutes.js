"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const geoPhotoController_1 = require("../controllers/geoPhotoController");
const auth_1 = require("../middlewares/auth");
const planEntitlements_1 = require("../middlewares/planEntitlements");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateJWT);
// Validation routes (promoteur can validate their own photos)
router.post('/validate/project/:projectId', (0, planEntitlements_1.requirePlanCapability)('geoVerification'), geoPhotoController_1.validatePhoto);
router.get('/validate/update/:updateId', (0, planEntitlements_1.requirePlanCapability)('geoVerification'), geoPhotoController_1.validateUpdatePhotos);
// Photo processing (promoteur)
router.post('/process/update/:updateId', (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), (0, planEntitlements_1.requirePlanCapability)('geoVerification'), geoPhotoController_1.processGeolocatedPhotos);
// Anomaly detection by promoteur
router.get('/anomalies/promoteur/:promoteurId', (0, planEntitlements_1.requirePlanCapability)('geoVerification'), geoPhotoController_1.detectAnomalies);
// Verification report by project
router.get('/report/project/:projectId', (0, planEntitlements_1.requirePlanCapability)('geoVerification'), geoPhotoController_1.generateVerificationReport);
// Admin routes
router.get('/admin/issues', (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.AUDITOR), geoPhotoController_1.getUpdatesWithIssues);
exports.default = router;
