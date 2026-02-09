import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import * as disclaimerController from '../controllers/disclaimerController';

const router = Router();

// Public routes
router.get('/', disclaimerController.getAllDisclaimers);
router.get('/:slug', disclaimerController.getDisclaimerBySlug);

// Admin routes
router.put('/:slug', authenticateJWT, authorizeRoles(Role.ADMIN), disclaimerController.updateDisclaimer);
router.post('/initialize', authenticateJWT, authorizeRoles(Role.ADMIN), disclaimerController.initializeDisclaimers);

export default router;
