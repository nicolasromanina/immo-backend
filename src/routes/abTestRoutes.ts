import { Router } from 'express';
import { ABTestController } from '../controllers/ABTestController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// All A/B Testing routes require authentication and promoteur role
router.use(authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN));

// Get all tests for the authenticated user
router.get('/', ABTestController.getTests);

// Create a new A/B test
router.post('/', ABTestController.createTest);

// Get a specific A/B test
router.get('/:testId', ABTestController.getTest);

// Record an event (view, click, conversion)
router.post('/event', ABTestController.recordEvent);

// Stop a test (determine winner)
router.put('/:testId/stop', ABTestController.stopTest);

// Delete a test
router.delete('/:testId', ABTestController.deleteTest);

export default router;
