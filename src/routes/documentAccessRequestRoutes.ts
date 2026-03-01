import { Router } from 'express';
import { DocumentAccessRequestController } from '../controllers/documentAccessRequestController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Client routes - request access
router.post('/request', authenticateJWT, DocumentAccessRequestController.requestDocumentAccess);

// Promoteur routes - manage requests
router.get('/promoteur/pending', authenticateJWT, DocumentAccessRequestController.getPendingRequests);
router.get('/promoteur', authenticateJWT, DocumentAccessRequestController.getAllRequests);
router.get('/:requestId', authenticateJWT, DocumentAccessRequestController.getRequestDetails);

// Promoteur routes - approve/deny
router.post('/:requestId/approve', authenticateJWT, DocumentAccessRequestController.grantAccess);
router.post('/:requestId/deny', authenticateJWT, DocumentAccessRequestController.denyAccess);

export default router;
