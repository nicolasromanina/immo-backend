"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const travelPlanController_1 = require("../controllers/travelPlanController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Public routes
router.get('/shared/:shareToken', travelPlanController_1.TravelPlanController.getSharedPlan);
// Protected routes - require authentication
router.use(auth_1.authenticateJWT);
// User routes - travel planning for diaspora
router.post('/', travelPlanController_1.TravelPlanController.createPlan);
router.get('/my-plans', travelPlanController_1.TravelPlanController.getMyPlans);
router.get('/:id', travelPlanController_1.TravelPlanController.getPlan);
router.put('/:id', travelPlanController_1.TravelPlanController.updatePlan);
router.delete('/:id', travelPlanController_1.TravelPlanController.deletePlan);
// Visit management
router.post('/:id/visits', travelPlanController_1.TravelPlanController.addVisit);
router.patch('/:id/visits/:visitId/confirm', travelPlanController_1.TravelPlanController.confirmVisit);
router.delete('/:id/visits/:visitId', travelPlanController_1.TravelPlanController.removeVisit);
router.patch('/:id/visits/:visitId/complete', travelPlanController_1.TravelPlanController.completeVisit);
// Optimization and sharing
router.post('/:id/optimize', travelPlanController_1.TravelPlanController.optimizeItinerary);
router.post('/:id/share', travelPlanController_1.TravelPlanController.generateShareLink);
// Promoteur routes - see upcoming visits
router.get('/promoteur/visits', (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), travelPlanController_1.TravelPlanController.getPromoteurUpcomingVisits);
exports.default = router;
