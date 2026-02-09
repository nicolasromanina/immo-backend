import { Router } from 'express';
import { DocumentController } from '../controllers/documentController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Get documents (public or restricted based on visibility)
router.get('/project/:projectId', DocumentController.getProjectDocuments);
router.get('/project/:projectId/stats', DocumentController.getDocumentStats);
router.get('/:id', DocumentController.getDocument);

// Public routes - shared document access (no auth required)
router.get('/shared/:token', DocumentController.accessSharedDocument);
router.get('/data-room/:token', DocumentController.accessDataRoom);

// Protected routes (promoteur only)
router.post('/', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), DocumentController.uploadDocument);
router.put('/:id', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), DocumentController.updateDocument);
router.post('/:id/replace', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), DocumentController.replaceDocument);
router.post('/:id/share', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), DocumentController.shareDocument);
router.delete('/:id', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), DocumentController.deleteDocument);

// Data-room / share link routes (promoteur only)
router.post('/:id/share-link', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), DocumentController.createShareLink);
router.get('/:id/share-links', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), DocumentController.getShareLinks);
router.delete('/share-links/:tokenId', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), DocumentController.revokeShareLink);
router.post('/project/:id/data-room', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), DocumentController.createDataRoom);

export default router;
