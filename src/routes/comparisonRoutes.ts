import { Router } from 'express';
import { ComparisonController } from '../controllers/comparisonController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';

const router = Router();

// Public route (with share token)
router.get('/shared/:token', ComparisonController.getByToken);

// Authenticated routes
router.post('/', authenticateJWT, ComparisonController.create);
router.get('/my-comparisons', authenticateJWT, ComparisonController.getMyComparisons);
router.get('/:id', authenticateJWT, ComparisonController.getById);
router.post('/:id/share', authenticateJWT, ComparisonController.share);
router.post('/:id/decision', authenticateJWT, ComparisonController.recordDecision);
router.delete('/:id', authenticateJWT, ComparisonController.delete);

export default router;
