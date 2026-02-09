import { Router } from 'express';
import { AppealController } from '../controllers/appealController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Promoteur routes
router.post('/', authenticateJWT, authorizeRoles(Role.PROMOTEUR), AppealController.create);
router.get('/my-appeals', authenticateJWT, authorizeRoles(Role.PROMOTEUR), AppealController.getMyAppeals);
router.get('/:id', authenticateJWT, AppealController.getById);

// Admin routes
router.get('/', authenticateJWT, authorizeRoles(Role.ADMIN), AppealController.getAll);
router.post('/:id/assign', authenticateJWT, authorizeRoles(Role.ADMIN), AppealController.assign);
router.post('/:id/note', authenticateJWT, authorizeRoles(Role.ADMIN), AppealController.addNote);
router.post('/:id/escalate', authenticateJWT, authorizeRoles(Role.ADMIN), AppealController.escalate);
router.post('/:id/resolve', authenticateJWT, authorizeRoles(Role.ADMIN), AppealController.resolve);
router.get('/stats/overview', authenticateJWT, authorizeRoles(Role.ADMIN), AppealController.getStats);

export default router;
