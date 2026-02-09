import { Router } from 'express';
import { TravelPlanController } from '../controllers/travelPlanController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Public routes
router.get('/shared/:shareToken', TravelPlanController.getSharedPlan);

// Protected routes - require authentication
router.use(authenticateJWT);

// User routes - travel planning for diaspora
router.post('/', TravelPlanController.createPlan);
router.get('/my-plans', TravelPlanController.getMyPlans);
router.get('/:id', TravelPlanController.getPlan);
router.put('/:id', TravelPlanController.updatePlan);
router.delete('/:id', TravelPlanController.deletePlan);

// Visit management
router.post('/:id/visits', TravelPlanController.addVisit);
router.patch('/:id/visits/:visitId/confirm', TravelPlanController.confirmVisit);
router.delete('/:id/visits/:visitId', TravelPlanController.removeVisit);
router.patch('/:id/visits/:visitId/complete', TravelPlanController.completeVisit);

// Optimization and sharing
router.post('/:id/optimize', TravelPlanController.optimizeItinerary);
router.post('/:id/share', TravelPlanController.generateShareLink);

// Promoteur routes - see upcoming visits
router.get('/promoteur/visits', authorizeRoles(Role.PROMOTEUR), TravelPlanController.getPromoteurUpcomingVisits);

export default router;
