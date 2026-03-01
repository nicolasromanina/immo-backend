import { Router } from 'express';
import { DocumentController } from '../controllers/documentController';
import { authenticateJWT, authenticateJWTOptional, authorizeRoles } from '../middlewares/auth';
import { requirePromoteurAccess, requirePromoteurPermission } from '../middlewares/promoteurRbac';
import { requirePlanCapability, requireDocumentQuota } from '../middlewares/planEntitlements';
import { Role } from '../config/roles';

const router = Router();

// Protected routes (promoteur only) - POST/PUT/DELETE operations
router.post('/', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), requireDocumentQuota(), DocumentController.uploadDocument);
router.put('/:id', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), DocumentController.updateDocument);
router.post('/:id/replace', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), DocumentController.replaceDocument);
router.post('/:id/share', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), requirePlanCapability('dataRoom'), DocumentController.shareDocument);
router.delete('/:id', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), DocumentController.deleteDocument);

// Admin routes - document approval
router.get('/admin/pending', authenticateJWT, authorizeRoles(Role.ADMIN), DocumentController.getPendingDocuments);
router.post('/:id/approve', authenticateJWT, authorizeRoles(Role.ADMIN), DocumentController.approveDocument);
router.post('/:id/reject', authenticateJWT, authorizeRoles(Role.ADMIN), DocumentController.rejectDocument);

// Data-room / share link routes (promoteur only)
router.post('/:id/share-link', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), requirePlanCapability('dataRoom'), DocumentController.createShareLink);
router.get('/:id/share-links', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewProjects'), requirePlanCapability('dataRoom'), DocumentController.getShareLinks);
router.delete('/share-links/:tokenId', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), requirePlanCapability('dataRoom'), DocumentController.revokeShareLink);
router.post('/project/:id/data-room', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), requirePlanCapability('dataRoom'), DocumentController.createDataRoom);

// Get documents (public or restricted based on visibility)
router.get('/project/:projectId', authenticateJWTOptional, DocumentController.getProjectDocuments);
router.get('/project/:projectId/stats', DocumentController.getDocumentStats);

// Public routes - shared document access (no auth required)
router.get('/shared/:token', DocumentController.accessSharedDocument);
router.get('/data-room/:token', DocumentController.accessDataRoom);

// Get single document (must be last due to :id parameter)
router.get('/:id', authenticateJWTOptional, DocumentController.getDocument);

export default router;
