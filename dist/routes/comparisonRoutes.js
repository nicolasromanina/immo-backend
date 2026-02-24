"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comparisonController_1 = require("../controllers/comparisonController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Public route (with share token)
router.get('/shared/:token', comparisonController_1.ComparisonController.getByToken);
// Authenticated routes
router.post('/', auth_1.authenticateJWT, comparisonController_1.ComparisonController.create);
// Admin list (used by admin dashboard)
router.get('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), comparisonController_1.ComparisonController.getAll);
router.get('/my-comparisons', auth_1.authenticateJWT, comparisonController_1.ComparisonController.getMyComparisons);
router.get('/:id', auth_1.authenticateJWT, comparisonController_1.ComparisonController.getById);
router.post('/:id/share', auth_1.authenticateJWT, comparisonController_1.ComparisonController.share);
router.post('/:id/decision', auth_1.authenticateJWT, comparisonController_1.ComparisonController.recordDecision);
router.delete('/:id', auth_1.authenticateJWT, comparisonController_1.ComparisonController.delete);
exports.default = router;
