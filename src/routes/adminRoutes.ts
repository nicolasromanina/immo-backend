
import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';


const router = Router();

// All routes require authentication and admin role
router.use(authenticateJWT);
router.use(authorizeRoles(Role.ADMIN, Role.SUPPORT));

// KYC document validation (individual)
router.post('/promoteurs/:promoteurId/kyc-docs/:docId/verify', AdminController.verifyKYCDocument);

// Company documents validation (individual)
router.post('/promoteurs/:promoteurId/company-docs/:docId/approve', AdminController.approveCompanyDocument);

// Financial proof document validation (individual)
router.post('/promoteurs/:promoteurId/financial-docs/:docId/approve', AdminController.approveFinancialProofDocument);

// Project documents verification
router.get('/documents/unverified', AdminController.getUnverifiedProjectDocuments);
router.post('/documents/:documentId/verify', AdminController.verifyProjectDocument);

// Dashboard
router.get('/dashboard/stats', AdminController.getDashboardStats);
// SLA endpoints
router.get('/sla/dashboard', AdminController.getSlaDashboard);
router.get('/sla/stats', AdminController.getSlaStats);
// Sanctions endpoints
router.get('/sanctions', AdminController.getSanctions);
router.get('/sanctions/:id', AdminController.getSanctionById);
router.post('/sanctions/manual', authenticateJWT, authorizeRoles(Role.ADMIN), AdminController.applyManualSanction);
router.post('/sanctions/:id/revoke', authenticateJWT, authorizeRoles(Role.ADMIN), AdminController.revokeSanction);
router.get('/sanctions/promoteur/:promoteurId', AdminController.getPromoteurSanctions);
router.get('/sanctions/stats/overview', AdminController.getSanctionsStats);

// Promoteurs management
router.get('/promoteurs', AdminController.getPromoteurs);
router.get('/promoteurs/:id', AdminController.getPromoteur);
router.post('/promoteurs/:id/verify-kyc', AdminController.verifyKYC);
router.post('/promoteurs/:id/restrict', AdminController.applyRestriction);
router.post('/promoteurs/:id/compliance/review', AdminController.reviewComplianceRequest);
router.post('/promoteurs/:id/apply-plan-change', AdminController.applyPlanChange);
// Admin: force-send onboarding reminder to a specific promoteur (for testing)
router.post('/promoteurs/:id/send-onboarding-reminder', AdminController.sendOnboardingReminder);

// Projects moderation
router.get('/projects', AdminController.getProjects);
router.get('/activities/recent', AdminController.getRecentActivity);
router.get('/alerts', AdminController.getAlerts);

// Featured admin routes (mirror for admin-prefixed client calls)
import { FeaturedController } from '../controllers/featuredController';
import { BadgeController } from '../controllers/badgeController';
router.get('/featured/slots', FeaturedController.getAllSlots);
router.get('/featured/slots/:id/performance', FeaturedController.getSlotPerformance);
router.post('/featured/slots', authenticateJWT, authorizeRoles(Role.ADMIN), FeaturedController.createFeaturedSlot);
router.put('/featured/slots/:id', authenticateJWT, authorizeRoles(Role.ADMIN), FeaturedController.updateSlot);
router.patch('/featured/slots/:id/cancel', authenticateJWT, authorizeRoles(Role.ADMIN), FeaturedController.cancelFeaturedSlot);
router.patch('/featured/slots/:id/approve', authenticateJWT, authorizeRoles(Role.ADMIN), FeaturedController.approveSlot);
router.patch('/featured/slots/:id/reject', authenticateJWT, authorizeRoles(Role.ADMIN), FeaturedController.rejectSlot);
router.post('/featured/auto-feature', authenticateJWT, authorizeRoles(Role.ADMIN), FeaturedController.runAutoFeature);

router.post('/projects/:id/moderate', AdminController.moderateProject);
router.post('/projects/:id/feature', AdminController.setProjectFeatured);

// Documents management
router.get('/documents', AdminController.getDocuments);
router.post('/documents/:id/status', AdminController.updateDocumentStatus);
router.post('/documents/:id/verify', AdminController.verifyDocument);
router.get('/documents/missing', AdminController.getMissingDocuments);
router.post('/documents/expired/check', AdminController.checkExpiredDocuments);

// Appeals
router.get('/appeals', AdminController.getAppeals);
router.post('/appeals/:id/process', AdminController.processAppeal);

// Reports
router.get('/reports', AdminController.getReports);
router.post('/reports/:id/process', AdminController.processReport);

// Badges
router.get('/badges', AdminController.manageBadges);
router.get('/badges/:id', BadgeController.getById);
router.post('/badges', BadgeController.create);
router.put('/badges/:id', BadgeController.update);
router.delete('/badges/:id', BadgeController.delete);
router.post('/badges/award', AdminController.awardBadge);
router.post('/badges/correction', AdminController.applyBadgeCorrection);
router.post('/badges/initialize-defaults', BadgeController.initializeDefaults);
router.post('/badges/check/:promoteurId', BadgeController.checkAndAward);
router.post('/badges/assign', authenticateJWT, authorizeRoles(Role.ADMIN), BadgeController.assignBadge);
router.post('/badges/revoke', authenticateJWT, authorizeRoles(Role.ADMIN), BadgeController.revokeBadge);

// Audit logs
router.get('/audit-logs', AdminController.getAuditLogs);

// A/B Tests (admin view all)
import { ABTestController } from '../controllers/ABTestController';
router.get('/ab-tests', ABTestController.getAllForAdmin);

// Backfill trust score snapshots (admin)
router.post('/trust-score-snapshots/backfill', AdminController.backfillTrustScoreSnapshots);

export default router;
