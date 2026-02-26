import { Router } from 'express';
import { UpdateController } from '../controllers/updateController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { requirePromoteurAccess, requirePromoteurPermission } from '../middlewares/promoteurRbac';
import { requireUpdateQuota } from '../middlewares/planEntitlements';
import { Role } from '../config/roles';

const router = Router();

// Public routes
router.get('/project/:projectId', UpdateController.getProjectUpdates);
router.get('/:id', UpdateController.getUpdate);

// Protected routes (promoteur only)
router.post('/', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), requireUpdateQuota(), UpdateController.createUpdate);
router.post('/:id/publish', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), UpdateController.publishUpdate);
router.put('/:id', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), UpdateController.updateUpdate);
router.delete('/:id', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), UpdateController.deleteUpdate);
router.get('/my/list', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewProjects'), UpdateController.getMyUpdates);
router.get('/my/calendar', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewProjects'), UpdateController.getUpdatesCalendar);

export default router;
