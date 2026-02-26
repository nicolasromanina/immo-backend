"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const featuredController_1 = require("../controllers/featuredController");
const auth_1 = require("../middlewares/auth");
const planEntitlements_1 = require("../middlewares/planEntitlements");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Public discovery endpoints
router.get('/items', featuredController_1.FeaturedController.getFeaturedItems);
router.get('/top-verified', featuredController_1.FeaturedController.getTopVerifiedProjects);
router.get('/new', featuredController_1.FeaturedController.getNewProjects);
router.post('/track/click', featuredController_1.FeaturedController.trackClick);
// Promoteur endpoints
router.post('/slots', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), (0, planEntitlements_1.requirePlanCapability)('featuredPlacement'), featuredController_1.FeaturedController.createFeaturedSlot);
router.get('/slots/:id/performance', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), (0, planEntitlements_1.requirePlanCapability)('featuredPlacement'), featuredController_1.FeaturedController.getSlotPerformance);
router.patch('/slots/:id/cancel', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), (0, planEntitlements_1.requirePlanCapability)('featuredPlacement'), featuredController_1.FeaturedController.cancelFeaturedSlot);
// Admin endpoints
router.get('/admin/slots', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), featuredController_1.FeaturedController.getAllSlots);
router.post('/admin/auto-feature', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), featuredController_1.FeaturedController.runAutoFeature);
exports.default = router;
