import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import * as crisisController from '../controllers/crisisController';

const router = Router();

// All crisis routes are admin-only
router.post('/', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), crisisController.declareCrisis);
router.get('/active', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), crisisController.getActiveCrises);
router.get('/', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), crisisController.getAllCrises);
router.get('/:id', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), crisisController.getCrisisById);
router.put('/:id/status', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), crisisController.updateCrisisStatus);
router.put('/:id/assign', authenticateJWT, authorizeRoles(Role.ADMIN), crisisController.assignCrisis);
router.post('/:id/communicate', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), crisisController.sendCrisisCommunication);
router.put('/:id/resolve', authenticateJWT, authorizeRoles(Role.ADMIN), crisisController.resolveCrisis);

export default router;
