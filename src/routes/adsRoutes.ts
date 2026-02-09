import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import * as adsController from '../controllers/adsController';

const router = Router();

// Public tracking routes
router.post('/:id/impression', adsController.trackImpression);
router.post('/:id/click', adsController.trackClick);
router.get('/active', adsController.getActiveAds);

// Promoteur routes
router.post('/', authenticateJWT, adsController.createAd);
router.get('/my', authenticateJWT, adsController.getMyAds);
router.put('/:id/submit', authenticateJWT, adsController.submitAdForReview);
router.put('/:id/pause', authenticateJWT, adsController.pauseAd);
router.put('/:id/resume', authenticateJWT, adsController.resumeAd);

// Admin routes
router.get('/', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), adsController.getAllAds);
router.put('/:id/approve', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), adsController.approveAd);
router.put('/:id/reject', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), adsController.rejectAd);

export default router;
