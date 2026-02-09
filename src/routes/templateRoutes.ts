import { Router } from 'express';
import { TemplateController } from '../controllers/templateController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';

import { Role } from '../config/roles';

const router = Router();

// Public routes (for promoteurs to use templates)
router.get('/', authenticateJWT, TemplateController.getAll);
router.get('/slug/:slug', authenticateJWT, TemplateController.getBySlug);
router.post('/render/:slug', authenticateJWT, TemplateController.render);
router.get('/most-used', authenticateJWT, TemplateController.getMostUsed);

// Admin routes
router.post('/', authenticateJWT, authorizeRoles(Role.ADMIN), TemplateController.create);
router.put('/:id', authenticateJWT, authorizeRoles(Role.ADMIN), TemplateController.update);
router.delete('/:id', authenticateJWT, authorizeRoles(Role.ADMIN), TemplateController.delete);
router.post('/initialize-defaults', authenticateJWT, authorizeRoles(Role.ADMIN), TemplateController.initializeDefaults);

export default router;
