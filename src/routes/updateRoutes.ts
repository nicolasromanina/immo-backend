import { Router } from 'express';
import { UpdateController } from '../controllers/updateController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Public routes
router.get('/project/:projectId', UpdateController.getProjectUpdates);
router.get('/:id', UpdateController.getUpdate);

// Protected routes (promoteur only)
router.post('/', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), UpdateController.createUpdate);
router.post('/:id/publish', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), UpdateController.publishUpdate);
router.put('/:id', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), UpdateController.updateUpdate);
router.delete('/:id', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), UpdateController.deleteUpdate);
router.get('/my/list', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), UpdateController.getMyUpdates);
router.get('/my/calendar', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), UpdateController.getUpdatesCalendar);

export default router;
