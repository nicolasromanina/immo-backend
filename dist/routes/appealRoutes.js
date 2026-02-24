"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const appealController_1 = require("../controllers/appealController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Promoteur routes
router.post('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), appealController_1.AppealController.create);
router.get('/my-appeals', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), appealController_1.AppealController.getMyAppeals);
router.get('/:id', auth_1.authenticateJWT, appealController_1.AppealController.getById);
// Admin routes
router.get('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), appealController_1.AppealController.getAll);
router.post('/:id/assign', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), appealController_1.AppealController.assign);
router.post('/:id/note', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), appealController_1.AppealController.addNote);
router.post('/:id/escalate', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), appealController_1.AppealController.escalate);
router.post('/:id/resolve', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), appealController_1.AppealController.resolve);
router.get('/stats/overview', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), appealController_1.AppealController.getStats);
exports.default = router;
