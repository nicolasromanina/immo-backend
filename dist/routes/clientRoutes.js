"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const clientController_1 = require("../controllers/clientController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Configure multer for avatar uploads
const avatarDir = path_1.default.join(process.cwd(), 'uploads', 'avatars');
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, avatarDir);
    },
    filename: function (req, file, cb) {
        const ext = path_1.default.extname(file.originalname);
        const base = 'avatar-' + Date.now();
        cb(null, base + ext);
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});
// All routes require authentication
router.use(auth_1.authenticateJWT);
// Profile
router.get('/profile', clientController_1.ClientController.getProfile);
router.put('/profile', clientController_1.ClientController.updateProfile);
router.put('/avatar', upload.single('avatar'), clientController_1.ClientController.uploadAvatar);
// Favorites
router.post('/favorites/:projectId', clientController_1.ClientController.addFavorite);
router.delete('/favorites/:projectId', clientController_1.ClientController.removeFavorite);
router.get('/favorites', clientController_1.ClientController.getFavorites);
router.put('/favorites/:projectId', clientController_1.ClientController.updateFavorite);
// Projects
router.get('/projects/compare', clientController_1.ClientController.compareProjects);
router.get('/projects/search', clientController_1.ClientController.searchProjects);
// Appointments (client side)
router.get('/appointments', clientController_1.ClientController.getMyAppointments);
router.patch('/appointments/:id/cancel', clientController_1.ClientController.cancelMyAppointment);
// Reports
router.post('/report', clientController_1.ClientController.reportContent);
// Become Promoteur
router.get('/promoteur-status', clientController_1.ClientController.getPromoteurStatus);
router.post('/become-promoteur', clientController_1.ClientController.createBecomePromoteurSession);
router.post('/confirm-become-promoteur', clientController_1.ClientController.confirmBecomePromoteur);
// Become Promoteur — Stripe Checkout (nouvelle approche)
router.post('/become-promoteur-checkout', clientController_1.ClientController.createBecomePromoteurCheckout);
router.get('/verify-become-promoteur-session', clientController_1.ClientController.verifyBecomePromoteurSession);
// Notifications
router.get('/notifications', clientController_1.ClientController.getNotifications);
router.put('/notifications/:id/read', clientController_1.ClientController.markNotificationRead);
router.post('/notifications/read-all', clientController_1.ClientController.markAllNotificationsRead);
exports.default = router;
