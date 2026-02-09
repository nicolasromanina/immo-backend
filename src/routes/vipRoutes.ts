import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import * as vipController from '../controllers/vipController';

const router = Router();

router.post('/', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), vipController.submitBypassRequest);
router.get('/pending', authenticateJWT, authorizeRoles(Role.ADMIN), vipController.getPendingRequests);
router.get('/', authenticateJWT, authorizeRoles(Role.ADMIN), vipController.getAllVIPRequests);
router.get('/:id', authenticateJWT, authorizeRoles(Role.ADMIN), vipController.getVIPRequestById);
router.put('/:id/decision', authenticateJWT, authorizeRoles(Role.ADMIN), vipController.processDecision);

export default router;
