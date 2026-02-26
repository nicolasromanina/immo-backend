import { Router } from 'express';
import { TemplateController } from '../controllers/templateController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { requirePromoteurAccess, requirePromoteurPermission } from '../middlewares/promoteurRbac';
import { requirePlanCapability } from '../middlewares/planEntitlements';

import { Role } from '../config/roles';

const router = Router();

// Public routes (for promoteurs to use templates)
router.get('/', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewLeads'), requirePlanCapability('templateLibrary'), TemplateController.getAll);
router.get('/slug/:slug', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewLeads'), requirePlanCapability('templateLibrary'), TemplateController.getBySlug);
router.post('/render/:slug', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editLeads'), requirePlanCapability('templateLibrary'), TemplateController.render);
router.get('/most-used', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewLeads'), requirePlanCapability('templateLibrary'), TemplateController.getMostUsed);

// Admin routes
router.post('/', authenticateJWT, authorizeRoles(Role.ADMIN), TemplateController.create);
router.put('/:id', authenticateJWT, authorizeRoles(Role.ADMIN), TemplateController.update);
router.delete('/:id', authenticateJWT, authorizeRoles(Role.ADMIN), TemplateController.delete);
router.post('/initialize-defaults', authenticateJWT, authorizeRoles(Role.ADMIN), TemplateController.initializeDefaults);

export default router;
