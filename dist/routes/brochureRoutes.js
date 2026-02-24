"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const brochureController_1 = require("../controllers/brochureController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// ==================== Public Endpoints ====================
// Request brochure (can be unauthenticated for lead capture)
router.post('/request', brochureController_1.BrochureController.requestBrochure);
// Track email open (tracking pixel)
router.get('/track/email/:id', brochureController_1.BrochureController.trackEmailOpen);
// Track download
router.post('/track/download/:id', brochureController_1.BrochureController.trackDownload);
// ==================== Authenticated User Endpoints ====================  
// Send brochure via WhatsApp
router.post('/:id/whatsapp', auth_1.authenticateJWT, brochureController_1.BrochureController.sendViaWhatsApp);
// ==================== Promoteur Endpoints ====================
// Get my brochure requests
router.get('/my-requests', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), brochureController_1.BrochureController.getMyRequests);
// Get brochure stats
router.get('/stats', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), brochureController_1.BrochureController.getStats);
// Get project brochure requests
router.get('/project/:projectId', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), brochureController_1.BrochureController.getProjectRequests);
exports.default = router;
