"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportingController_1 = require("../controllers/reportingController");
const auth_1 = require("../middlewares/auth");
const planEntitlements_1 = require("../middlewares/planEntitlements");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Promoteur routes
router.get('/sla/my-dashboard', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), (0, planEntitlements_1.requirePlanCapability)('advancedAnalytics'), reportingController_1.ReportingController.getMySLADashboard);
router.get('/sanctions/my-history', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), (0, planEntitlements_1.requirePlanCapability)('advancedAnalytics'), reportingController_1.ReportingController.getMySanctionHistory);
// Admin routes
router.get('/monthly', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), reportingController_1.ReportingController.getMonthlyReport);
router.get('/promoteur/:promoteurId', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), reportingController_1.ReportingController.getPromoteurReport);
// Promoteur can fetch their own performance report
router.get('/promoteur/me', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), (0, planEntitlements_1.requirePlanCapability)('advancedAnalytics'), reportingController_1.ReportingController.getMyPromoteurReport);
router.get('/discipline-dashboard', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), reportingController_1.ReportingController.getDisciplineDashboard);
router.get('/sla/:promoteurId', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), reportingController_1.ReportingController.getSLADashboard);
router.get('/sanctions/:promoteurId', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), reportingController_1.ReportingController.getSanctionHistory);
// Cron/automated routes (should be protected by API key or IP whitelist in production)
router.post('/trigger/sla-monitoring', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), reportingController_1.ReportingController.triggerSLAMonitoring);
router.post('/trigger/sanctions-check', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), reportingController_1.ReportingController.triggerSanctionsCheck);
router.post('/trigger/expired-restrictions', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), reportingController_1.ReportingController.removeExpiredRestrictions);
exports.default = router;
