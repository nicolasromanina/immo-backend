"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clientController_1 = require("../controllers/clientController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateJWT);
// Profile
router.get('/profile', clientController_1.ClientController.getProfile);
router.put('/profile', clientController_1.ClientController.updateProfile);
// Favorites
router.post('/favorites/:projectId', clientController_1.ClientController.addFavorite);
router.delete('/favorites/:projectId', clientController_1.ClientController.removeFavorite);
router.get('/favorites', clientController_1.ClientController.getFavorites);
router.put('/favorites/:projectId', clientController_1.ClientController.updateFavorite);
// Projects
router.get('/projects/compare', clientController_1.ClientController.compareProjects);
router.get('/projects/search', clientController_1.ClientController.searchProjects);
// Reports
router.post('/report', clientController_1.ClientController.reportContent);
// Become Promoteur
router.get('/promoteur-status', clientController_1.ClientController.getPromoteurStatus);
router.post('/become-promoteur', clientController_1.ClientController.createBecomePromoteurSession);
router.post('/confirm-become-promoteur', clientController_1.ClientController.confirmBecomePromoteur);
// Notifications
router.get('/notifications', clientController_1.ClientController.getNotifications);
router.put('/notifications/:id/read', clientController_1.ClientController.markNotificationRead);
router.post('/notifications/read-all', clientController_1.ClientController.markAllNotificationsRead);
exports.default = router;
