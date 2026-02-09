import { Router } from 'express';
import { getProfile, getUsers, promoteUser } from '../controllers/userController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

router.get('/me', authenticateJWT, getProfile);
router.get('/', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), getUsers);
router.post('/:id/promote', authenticateJWT, authorizeRoles(Role.ADMIN), promoteUser);

export default router;
