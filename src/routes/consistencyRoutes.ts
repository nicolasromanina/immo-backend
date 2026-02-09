import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import * as consistencyController from '../controllers/consistencyController';

const router = Router();

router.get('/project/:projectId', authenticateJWT, consistencyController.getProjectConsistency);
router.get('/promoteur/:promoteurId', authenticateJWT, consistencyController.getPromoteurConsistency);
router.get('/flagged', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), consistencyController.getFlaggedProjects);

export default router;
