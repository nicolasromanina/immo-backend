"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const updateController_1 = require("../controllers/updateController");
const auth_1 = require("../middlewares/auth");
const promoteurRbac_1 = require("../middlewares/promoteurRbac");
const planEntitlements_1 = require("../middlewares/planEntitlements");
const router = (0, express_1.Router)();
// Public routes
router.get('/project/:projectId', updateController_1.UpdateController.getProjectUpdates);
router.get('/:id', updateController_1.UpdateController.getUpdate);
// Protected routes (promoteur only)
router.post('/', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), (0, planEntitlements_1.requireUpdateQuota)(), updateController_1.UpdateController.createUpdate);
router.post('/:id/publish', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), updateController_1.UpdateController.publishUpdate);
router.put('/:id', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), updateController_1.UpdateController.updateUpdate);
router.delete('/:id', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), updateController_1.UpdateController.deleteUpdate);
router.get('/my/list', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('viewProjects'), updateController_1.UpdateController.getMyUpdates);
router.get('/my/calendar', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('viewProjects'), updateController_1.UpdateController.getUpdatesCalendar);
exports.default = router;
