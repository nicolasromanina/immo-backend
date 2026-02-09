import { Router } from 'express';
import { FeaturedController } from '../controllers/featuredController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Public discovery endpoints
router.get('/items', FeaturedController.getFeaturedItems);
router.get('/top-verified', FeaturedController.getTopVerifiedProjects);
router.get('/new', FeaturedController.getNewProjects);
router.post('/track/click', FeaturedController.trackClick);

// Promoteur endpoints
router.post('/slots', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), FeaturedController.createFeaturedSlot);
router.get('/slots/:id/performance', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), FeaturedController.getSlotPerformance);
router.patch('/slots/:id/cancel', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), FeaturedController.cancelFeaturedSlot);

// Admin endpoints
router.get('/admin/slots', authenticateJWT, authorizeRoles(Role.ADMIN), FeaturedController.getAllSlots);
router.post('/admin/auto-feature', authenticateJWT, authorizeRoles(Role.ADMIN), FeaturedController.runAutoFeature);

export default router;
