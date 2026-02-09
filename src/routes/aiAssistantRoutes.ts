import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth';
import * as aiController from '../controllers/aiAssistantController';

const router = Router();

// All AI routes require authentication
router.post('/generate', authenticateJWT, aiController.generateText);
router.post('/generate/alternatives', authenticateJWT, aiController.generateWithAlternatives);
router.post('/improve', authenticateJWT, aiController.improveText);
router.post('/project-description', authenticateJWT, aiController.generateProjectDescription);
router.post('/update-text', authenticateJWT, aiController.generateUpdateText);
router.post('/lead-response', authenticateJWT, aiController.generateLeadResponse);

export default router;
