"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const trustScoreConfigController_1 = require("../controllers/trustScoreConfigController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// All routes require admin access
router.use(auth_1.authenticateJWT);
router.use((0, auth_1.authorizeRoles)(roles_1.Role.ADMIN));
// Configuration management
router.get('/active', trustScoreConfigController_1.TrustScoreConfigController.getActiveConfig);
router.get('/', trustScoreConfigController_1.TrustScoreConfigController.getAllConfigs);
router.get('/:id', trustScoreConfigController_1.TrustScoreConfigController.getConfig);
router.post('/', trustScoreConfigController_1.TrustScoreConfigController.saveConfig);
router.patch('/:id/activate', trustScoreConfigController_1.TrustScoreConfigController.activateConfig);
router.delete('/:id', trustScoreConfigController_1.TrustScoreConfigController.deleteConfig);
// Score calculation
router.post('/calculate/:promoteurId', trustScoreConfigController_1.TrustScoreConfigController.calculateScore);
router.post('/recalculate-all', trustScoreConfigController_1.TrustScoreConfigController.recalculateAllScores);
router.get('/history/:promoteurId', trustScoreConfigController_1.TrustScoreConfigController.getScoreHistory);
exports.default = router;
