import { Router } from 'express';
import { 
  generateBrochure, 
  generateSocialPost, 
  generateSummary, 
  generatePromoteurBrochure,
  bulkGenerateBrochures
} from '../controllers/autoBrochureController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { requirePlanCapability } from '../middlewares/planEntitlements';
import { Role } from '../config/roles';

const router = Router();

// Public routes - generate brochure for any public project
router.get('/project/:projectId', generateBrochure);
router.get('/social/:projectId', generateSocialPost);
router.get('/summary/:projectId', generateSummary);

// Protected routes - require authentication
router.use(authenticateJWT);

// Promoteur routes - generate brochure for own projects
router.post('/promoteur/project/:projectId', authorizeRoles(Role.PROMOTEUR), requirePlanCapability('autoBrochure'), generatePromoteurBrochure);

// Admin routes - bulk operations
router.post('/admin/bulk', authorizeRoles(Role.ADMIN), bulkGenerateBrochures);

export default router;
