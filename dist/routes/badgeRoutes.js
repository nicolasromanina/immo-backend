"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const badgeController_1 = require("../controllers/badgeController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Public routes
router.get('/', badgeController_1.BadgeController.getAll);
router.get('/:id', badgeController_1.BadgeController.getById);
// Admin routes
router.post('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), badgeController_1.BadgeController.create);
router.put('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), badgeController_1.BadgeController.update);
router.delete('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), badgeController_1.BadgeController.delete);
router.post('/check/:promoteurId', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), badgeController_1.BadgeController.checkAndAward);
router.post('/initialize-defaults', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), badgeController_1.BadgeController.initializeDefaults);
exports.default = router;
