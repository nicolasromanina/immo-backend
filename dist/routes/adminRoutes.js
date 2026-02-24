"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// All routes require authentication and admin role
router.use(auth_1.authenticateJWT);
router.use((0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT));
// KYC document validation (individual)
router.post('/promoteurs/:promoteurId/kyc-docs/:docId/verify', adminController_1.AdminController.verifyKYCDocument);
// Company documents validation (individual)
router.post('/promoteurs/:promoteurId/company-docs/:docId/approve', adminController_1.AdminController.approveCompanyDocument);
// Financial proof document validation (individual)
router.post('/promoteurs/:promoteurId/financial-docs/:docId/approve', adminController_1.AdminController.approveFinancialProofDocument);
// Project documents verification
router.get('/documents/unverified', adminController_1.AdminController.getUnverifiedProjectDocuments);
router.post('/documents/:documentId/verify', adminController_1.AdminController.verifyProjectDocument);
// Dashboard
router.get('/dashboard/stats', adminController_1.AdminController.getDashboardStats);
// SLA endpoints
router.get('/sla/dashboard', adminController_1.AdminController.getSlaDashboard);
router.get('/sla/stats', adminController_1.AdminController.getSlaStats);
// Sanctions endpoints
router.get('/sanctions', adminController_1.AdminController.getSanctions);
router.get('/sanctions/:id', adminController_1.AdminController.getSanctionById);
router.post('/sanctions/manual', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), adminController_1.AdminController.applyManualSanction);
router.post('/sanctions/:id/revoke', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), adminController_1.AdminController.revokeSanction);
router.get('/sanctions/promoteur/:promoteurId', adminController_1.AdminController.getPromoteurSanctions);
router.get('/sanctions/stats/overview', adminController_1.AdminController.getSanctionsStats);
// Promoteurs management
router.get('/promoteurs', adminController_1.AdminController.getPromoteurs);
router.get('/promoteurs/:id', adminController_1.AdminController.getPromoteur);
router.post('/promoteurs/:id/verify-kyc', adminController_1.AdminController.verifyKYC);
router.post('/promoteurs/:id/restrict', adminController_1.AdminController.applyRestriction);
router.post('/promoteurs/:id/compliance/review', adminController_1.AdminController.reviewComplianceRequest);
router.post('/promoteurs/:id/apply-plan-change', adminController_1.AdminController.applyPlanChange);
// Admin: force-send onboarding reminder to a specific promoteur (for testing)
router.post('/promoteurs/:id/send-onboarding-reminder', adminController_1.AdminController.sendOnboardingReminder);
// Projects moderation
router.get('/projects', adminController_1.AdminController.getProjects);
router.get('/activities/recent', adminController_1.AdminController.getRecentActivity);
router.get('/alerts', adminController_1.AdminController.getAlerts);
// Featured admin routes (mirror for admin-prefixed client calls)
const featuredController_1 = require("../controllers/featuredController");
const badgeController_1 = require("../controllers/badgeController");
router.get('/featured/slots', featuredController_1.FeaturedController.getAllSlots);
router.get('/featured/slots/:id/performance', featuredController_1.FeaturedController.getSlotPerformance);
router.post('/featured/slots', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), featuredController_1.FeaturedController.createFeaturedSlot);
router.put('/featured/slots/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), featuredController_1.FeaturedController.updateSlot);
router.patch('/featured/slots/:id/cancel', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), featuredController_1.FeaturedController.cancelFeaturedSlot);
router.patch('/featured/slots/:id/approve', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), featuredController_1.FeaturedController.approveSlot);
router.patch('/featured/slots/:id/reject', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), featuredController_1.FeaturedController.rejectSlot);
router.post('/featured/auto-feature', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), featuredController_1.FeaturedController.runAutoFeature);
router.post('/projects/:id/moderate', adminController_1.AdminController.moderateProject);
router.post('/projects/:id/feature', adminController_1.AdminController.setProjectFeatured);
// Documents management
router.get('/documents', adminController_1.AdminController.getDocuments);
router.post('/documents/:id/status', adminController_1.AdminController.updateDocumentStatus);
router.post('/documents/:id/verify', adminController_1.AdminController.verifyDocument);
router.get('/documents/missing', adminController_1.AdminController.getMissingDocuments);
router.post('/documents/expired/check', adminController_1.AdminController.checkExpiredDocuments);
// Appeals
router.get('/appeals', adminController_1.AdminController.getAppeals);
router.post('/appeals/:id/process', adminController_1.AdminController.processAppeal);
// Reports
router.get('/reports', adminController_1.AdminController.getReports);
router.post('/reports/:id/process', adminController_1.AdminController.processReport);
// Badges
router.get('/badges', adminController_1.AdminController.manageBadges);
router.get('/badges/:id', badgeController_1.BadgeController.getById);
router.post('/badges', badgeController_1.BadgeController.create);
router.put('/badges/:id', badgeController_1.BadgeController.update);
router.delete('/badges/:id', badgeController_1.BadgeController.delete);
router.post('/badges/award', adminController_1.AdminController.awardBadge);
router.post('/badges/correction', adminController_1.AdminController.applyBadgeCorrection);
router.post('/badges/initialize-defaults', badgeController_1.BadgeController.initializeDefaults);
router.post('/badges/check/:promoteurId', badgeController_1.BadgeController.checkAndAward);
router.post('/badges/assign', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), badgeController_1.BadgeController.assignBadge);
router.post('/badges/revoke', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), badgeController_1.BadgeController.revokeBadge);
// Audit logs
router.get('/audit-logs', adminController_1.AdminController.getAuditLogs);
// A/B Tests (admin view all)
const ABTestController_1 = require("../controllers/ABTestController");
router.get('/ab-tests', ABTestController_1.ABTestController.getAllForAdmin);
// Backfill trust score snapshots (admin)
router.post('/trust-score-snapshots/backfill', adminController_1.AdminController.backfillTrustScoreSnapshots);
exports.default = router;
