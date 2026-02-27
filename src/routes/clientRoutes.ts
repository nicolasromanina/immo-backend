import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { ClientController } from '../controllers/clientController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';

const router = Router();

// Configure multer for avatar uploads
const avatarDir = path.join(process.cwd(), 'uploads', 'avatars');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = 'avatar-' + Date.now();
    cb(null, base + ext);
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// All routes require authentication
router.use(authenticateJWT);

// Profile
router.get('/profile', ClientController.getProfile);
router.put('/profile', ClientController.updateProfile);
router.put('/avatar', upload.single('avatar') as any, ClientController.uploadAvatar);

// Favorites
router.post('/favorites/:projectId', ClientController.addFavorite);
router.delete('/favorites/:projectId', ClientController.removeFavorite);
router.get('/favorites', ClientController.getFavorites);
router.put('/favorites/:projectId', ClientController.updateFavorite);

// Projects
router.get('/projects/compare', ClientController.compareProjects);
router.get('/projects/search', ClientController.searchProjects);

// Appointments (client side)
router.get('/appointments', ClientController.getMyAppointments);
router.patch('/appointments/:id/cancel', ClientController.cancelMyAppointment);

// Reports
router.post('/report', ClientController.reportContent);

// Become Promoteur
router.get('/promoteur-status', ClientController.getPromoteurStatus);
router.post('/become-promoteur', ClientController.createBecomePromoteurSession);
router.post('/confirm-become-promoteur', ClientController.confirmBecomePromoteur);
// Become Promoteur — Stripe Checkout (nouvelle approche)
router.post('/become-promoteur-checkout', ClientController.createBecomePromoteurCheckout);
router.get('/verify-become-promoteur-session', ClientController.verifyBecomePromoteurSession);

// Notifications
router.get('/notifications', ClientController.getNotifications);
router.put('/notifications/:id/read', ClientController.markNotificationRead);
router.post('/notifications/read-all', ClientController.markAllNotificationsRead);

export default router;
