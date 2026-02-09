import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import {
  createReport,
  getUserReports,
  getAdminReports,
  getReportById,
  assignReport,
  updateReportStatus,
  addInvestigationNote,
  resolveReport,
  dismissReport
} from '../controllers/reportController';

const router = Router();

// All report routes require authentication
router.use(authenticateJWT);

// User routes
router.post('/', createReport);
router.get('/my-reports', getUserReports);

// Admin routes
router.get('/admin', authorizeRoles(Role.ADMIN, Role.SUPPORT), getAdminReports);
router.get('/admin/:id', authorizeRoles(Role.ADMIN, Role.SUPPORT), getReportById);
router.patch('/admin/:id/assign', authorizeRoles(Role.ADMIN, Role.SUPPORT), assignReport);
router.patch('/admin/:id/status', authorizeRoles(Role.ADMIN, Role.SUPPORT), updateReportStatus);
router.post('/admin/:id/add-note', authorizeRoles(Role.ADMIN, Role.SUPPORT), addInvestigationNote);
router.post('/admin/:id/resolve', authorizeRoles(Role.ADMIN, Role.SUPPORT), resolveReport);
router.post('/admin/:id/dismiss', authorizeRoles(Role.ADMIN, Role.SUPPORT), dismissReport);

export default router;