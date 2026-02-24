"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const reportController_1 = require("../controllers/reportController");
const router = (0, express_1.Router)();
// All report routes require authentication
router.use(auth_1.authenticateJWT);
// User routes
router.post('/', reportController_1.createReport);
router.get('/my-reports', reportController_1.getUserReports);
// Admin routes
router.get('/admin', (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), reportController_1.getAdminReports);
router.get('/admin/:id', (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), reportController_1.getReportById);
router.patch('/admin/:id/assign', (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), reportController_1.assignReport);
router.patch('/admin/:id/status', (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), reportController_1.updateReportStatus);
router.post('/admin/:id/add-note', (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), reportController_1.addInvestigationNote);
router.post('/admin/:id/resolve', (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), reportController_1.resolveReport);
router.post('/admin/:id/dismiss', (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), reportController_1.dismissReport);
exports.default = router;
