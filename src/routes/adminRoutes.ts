import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// All routes require authentication and admin role
router.use(authenticateJWT);
router.use(authorizeRoles(Role.ADMIN, Role.SUPPORT));

// Dashboard
router.get('/dashboard/stats', AdminController.getDashboardStats);

// Promoteurs management
router.get('/promoteurs', AdminController.getPromoteurs);
router.post('/promoteurs/:id/verify-kyc', AdminController.verifyKYC);
router.post('/promoteurs/:id/restrict', AdminController.applyRestriction);
router.post('/promoteurs/:id/compliance/review', AdminController.reviewComplianceRequest);
router.post('/promoteurs/:id/apply-plan-change', AdminController.applyPlanChange);

// Projects moderation
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
router.post('/badges/award', AdminController.awardBadge);

// Audit logs
router.get('/audit-logs', AdminController.getAuditLogs);

export default router;
