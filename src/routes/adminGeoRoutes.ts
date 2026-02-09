import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import * as adminGeoController from '../controllers/adminGeoController';

const router = Router();

router.post('/', authenticateJWT, authorizeRoles(Role.ADMIN), adminGeoController.assignAdmin);
router.get('/search', authenticateJWT, authorizeRoles(Role.ADMIN), adminGeoController.getAdminForLocation);
router.get('/', authenticateJWT, authorizeRoles(Role.ADMIN), adminGeoController.getAllAssignments);
router.delete('/:id', authenticateJWT, authorizeRoles(Role.ADMIN), adminGeoController.removeAssignment);

export default router;
