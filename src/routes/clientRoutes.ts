import { Router } from 'express';
import { ClientController } from '../controllers/clientController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Profile
router.get('/profile', ClientController.getProfile);
router.put('/profile', ClientController.updateProfile);

// Favorites
router.post('/favorites/:projectId', ClientController.addFavorite);
router.delete('/favorites/:projectId', ClientController.removeFavorite);
router.get('/favorites', ClientController.getFavorites);
router.put('/favorites/:projectId', ClientController.updateFavorite);

// Projects
router.get('/projects/compare', ClientController.compareProjects);
router.get('/projects/search', ClientController.searchProjects);

// Reports
router.post('/report', ClientController.reportContent);

// Become Promoteur
router.get('/promoteur-status', ClientController.getPromoteurStatus);
router.post('/become-promoteur', ClientController.createBecomePromoteurSession);
router.post('/confirm-become-promoteur', ClientController.confirmBecomePromoteur);

// Notifications
router.get('/notifications', ClientController.getNotifications);
router.put('/notifications/:id/read', ClientController.markNotificationRead);
router.post('/notifications/read-all', ClientController.markAllNotificationsRead);

export default router;
