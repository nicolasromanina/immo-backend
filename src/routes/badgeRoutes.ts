import { Router } from 'express';
import { BadgeController } from '../controllers/badgeController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';

import { Role } from '../config/roles';

const router = Router();

// Public routes
router.get('/', BadgeController.getAll);
router.get('/:id', BadgeController.getById);

// Admin routes
router.post('/', authenticateJWT, authorizeRoles(Role.ADMIN), BadgeController.create);
router.put('/:id', authenticateJWT, authorizeRoles(Role.ADMIN), BadgeController.update);
router.delete('/:id', authenticateJWT, authorizeRoles(Role.ADMIN), BadgeController.delete);
router.post('/check/:promoteurId', authenticateJWT, authorizeRoles(Role.ADMIN), BadgeController.checkAndAward);
router.post('/initialize-defaults', authenticateJWT, authorizeRoles(Role.ADMIN), BadgeController.initializeDefaults);

export default router;
