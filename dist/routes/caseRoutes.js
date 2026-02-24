"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const caseController_1 = require("../controllers/caseController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Any authenticated user can create a case
router.post('/', auth_1.authenticateJWT, caseController_1.CaseController.create);
router.get('/my-cases', auth_1.authenticateJWT, caseController_1.CaseController.getMyCases);
router.get('/:id', auth_1.authenticateJWT, caseController_1.CaseController.getById);
router.post('/:id/feedback', auth_1.authenticateJWT, caseController_1.CaseController.submitFeedback);
// Admin routes
router.get('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), caseController_1.CaseController.getAll);
// Admin: stats overview for dashboard
// Use a cast to any to avoid TypeScript mismatch when controller type isn't updated
router.get('/stats/overview', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), caseController_1.CaseController.getStatsOverview);
router.post('/:id/assign', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), caseController_1.CaseController.assign);
router.post('/:id/note', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), caseController_1.CaseController.addNote);
router.post('/:id/communication', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), caseController_1.CaseController.addCommunication);
router.post('/:id/resolve', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), caseController_1.CaseController.resolve);
router.post('/:id/close', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), caseController_1.CaseController.close);
exports.default = router;
