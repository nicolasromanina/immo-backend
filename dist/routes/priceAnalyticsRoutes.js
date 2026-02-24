"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const priceAnalyticsController_1 = require("../controllers/priceAnalyticsController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Public routes - price comparison available to all
router.get('/area/:country/:city/:area', priceAnalyticsController_1.PriceAnalyticsController.getAreaStats);
router.get('/compare/:country/:city', priceAnalyticsController_1.PriceAnalyticsController.compareAreas);
router.get('/city/:country/:city', priceAnalyticsController_1.PriceAnalyticsController.getCityOverview);
router.get('/search', priceAnalyticsController_1.PriceAnalyticsController.searchByPriceRange);
router.get('/trends/:country/:city/:area', priceAnalyticsController_1.PriceAnalyticsController.getAreaTrends);
// Admin routes
router.use(auth_1.authenticateJWT);
router.post('/admin/recalculate', (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), priceAnalyticsController_1.PriceAnalyticsController.recalculateStats);
exports.default = router;
