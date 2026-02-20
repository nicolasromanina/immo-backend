import { Router } from 'express';
import { ReportingController } from '../controllers/reportingController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';

import { Role } from '../config/roles';

const router = Router();

// Promoteur routes
router.get('/sla/my-dashboard', authenticateJWT, authorizeRoles(Role.PROMOTEUR), ReportingController.getMySLADashboard);
router.get('/sanctions/my-history', authenticateJWT, authorizeRoles(Role.PROMOTEUR), ReportingController.getMySanctionHistory);

// Admin routes
router.get('/monthly', authenticateJWT, authorizeRoles(Role.ADMIN), ReportingController.getMonthlyReport);
router.get('/promoteur/:promoteurId', authenticateJWT, authorizeRoles(Role.ADMIN), ReportingController.getPromoteurReport);
// Promoteur can fetch their own performance report
router.get('/promoteur/me', authenticateJWT, authorizeRoles(Role.PROMOTEUR), ReportingController.getMyPromoteurReport);
router.get('/discipline-dashboard', authenticateJWT, authorizeRoles(Role.ADMIN), ReportingController.getDisciplineDashboard);
router.get('/sla/:promoteurId', authenticateJWT, authorizeRoles(Role.ADMIN), ReportingController.getSLADashboard);
router.get('/sanctions/:promoteurId', authenticateJWT, authorizeRoles(Role.ADMIN), ReportingController.getSanctionHistory);

// Cron/automated routes (should be protected by API key or IP whitelist in production)
router.post('/trigger/sla-monitoring', authenticateJWT, authorizeRoles(Role.ADMIN), ReportingController.triggerSLAMonitoring);
router.post('/trigger/sanctions-check', authenticateJWT, authorizeRoles(Role.ADMIN), ReportingController.triggerSanctionsCheck);
router.post('/trigger/expired-restrictions', authenticateJWT, authorizeRoles(Role.ADMIN), ReportingController.removeExpiredRestrictions);

export default router;
