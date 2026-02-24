"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const autoBrochureController_1 = require("../controllers/autoBrochureController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Public routes - generate brochure for any public project
router.get('/project/:projectId', autoBrochureController_1.generateBrochure);
router.get('/social/:projectId', autoBrochureController_1.generateSocialPost);
router.get('/summary/:projectId', autoBrochureController_1.generateSummary);
// Protected routes - require authentication
router.use(auth_1.authenticateJWT);
// Promoteur routes - generate brochure for own projects
router.post('/promoteur/project/:projectId', (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), autoBrochureController_1.generatePromoteurBrochure);
// Admin routes - bulk operations
router.post('/admin/bulk', (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), autoBrochureController_1.bulkGenerateBrochures);
exports.default = router;
