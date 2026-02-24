"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const updateController_1 = require("../controllers/updateController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Public routes
router.get('/project/:projectId', updateController_1.UpdateController.getProjectUpdates);
router.get('/:id', updateController_1.UpdateController.getUpdate);
// Protected routes (promoteur only)
router.post('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), updateController_1.UpdateController.createUpdate);
router.post('/:id/publish', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), updateController_1.UpdateController.publishUpdate);
router.put('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), updateController_1.UpdateController.updateUpdate);
router.delete('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), updateController_1.UpdateController.deleteUpdate);
router.get('/my/list', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), updateController_1.UpdateController.getMyUpdates);
router.get('/my/calendar', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), updateController_1.UpdateController.getUpdatesCalendar);
exports.default = router;
