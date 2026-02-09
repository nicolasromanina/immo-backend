import { Router } from 'express';
import { CaseController } from '../controllers/caseController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';

import { Role } from '../config/roles';

const router = Router();

// Any authenticated user can create a case
router.post('/', authenticateJWT, CaseController.create);
router.get('/my-cases', authenticateJWT, CaseController.getMyCases);
router.get('/:id', authenticateJWT, CaseController.getById);
router.post('/:id/feedback', authenticateJWT, CaseController.submitFeedback);

// Admin routes
router.get('/', authenticateJWT, authorizeRoles(Role.ADMIN), CaseController.getAll);
router.post('/:id/assign', authenticateJWT, authorizeRoles(Role.ADMIN), CaseController.assign);
router.post('/:id/note', authenticateJWT, authorizeRoles(Role.ADMIN), CaseController.addNote);
router.post('/:id/communication', authenticateJWT, authorizeRoles(Role.ADMIN), CaseController.addCommunication);
router.post('/:id/resolve', authenticateJWT, authorizeRoles(Role.ADMIN), CaseController.resolve);
router.post('/:id/close', authenticateJWT, authorizeRoles(Role.ADMIN), CaseController.close);

export default router;
