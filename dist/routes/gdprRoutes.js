"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gdprController_1 = require("../controllers/gdprController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// User GDPR rights endpoints
router.post('/request', auth_1.authenticateJWT, gdprController_1.GDPRController.createRequest);
router.get('/my-data', auth_1.authenticateJWT, gdprController_1.GDPRController.getMyData);
router.get('/export', auth_1.authenticateJWT, gdprController_1.GDPRController.exportMyData);
// Consent management
router.get('/consent', auth_1.authenticateJWT, gdprController_1.GDPRController.getMyConsents);
router.put('/consent', auth_1.authenticateJWT, gdprController_1.GDPRController.updateConsent);
router.put('/cookies', auth_1.authenticateJWT, gdprController_1.GDPRController.updateCookiePreferences);
// Admin endpoints
router.get('/admin/requests', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), gdprController_1.GDPRController.getRequests);
router.post('/admin/erasure/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), gdprController_1.GDPRController.processErasureRequest);
router.post('/admin/access/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), gdprController_1.GDPRController.processAccessRequest);
exports.default = router;
