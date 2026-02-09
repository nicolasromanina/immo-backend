import { Router } from 'express';
import { PriceAnalyticsController } from '../controllers/priceAnalyticsController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Public routes - price comparison available to all
router.get('/area/:country/:city/:area', PriceAnalyticsController.getAreaStats);
router.get('/compare/:country/:city', PriceAnalyticsController.compareAreas);
router.get('/city/:country/:city', PriceAnalyticsController.getCityOverview);
router.get('/search', PriceAnalyticsController.searchByPriceRange);
router.get('/trends/:country/:city/:area', PriceAnalyticsController.getAreaTrends);

// Admin routes
router.use(authenticateJWT);
router.post('/admin/recalculate', authorizeRoles(Role.ADMIN), PriceAnalyticsController.recalculateStats);

export default router;
