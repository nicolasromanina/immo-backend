"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentController_1 = require("../controllers/documentController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Get documents (public or restricted based on visibility)
router.get('/project/:projectId', auth_1.authenticateJWTOptional, documentController_1.DocumentController.getProjectDocuments);
router.get('/project/:projectId/stats', documentController_1.DocumentController.getDocumentStats);
router.get('/:id', documentController_1.DocumentController.getDocument);
// Public routes - shared document access (no auth required)
router.get('/shared/:token', documentController_1.DocumentController.accessSharedDocument);
router.get('/data-room/:token', documentController_1.DocumentController.accessDataRoom);
// Protected routes (promoteur only)
router.post('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), documentController_1.DocumentController.uploadDocument);
router.put('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), documentController_1.DocumentController.updateDocument);
router.post('/:id/replace', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), documentController_1.DocumentController.replaceDocument);
router.post('/:id/share', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), documentController_1.DocumentController.shareDocument);
router.delete('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), documentController_1.DocumentController.deleteDocument);
// Admin routes - document approval
router.post('/:id/approve', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), documentController_1.DocumentController.approveDocument);
router.post('/:id/reject', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), documentController_1.DocumentController.rejectDocument);
// Data-room / share link routes (promoteur only)
router.post('/:id/share-link', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), documentController_1.DocumentController.createShareLink);
router.get('/:id/share-links', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), documentController_1.DocumentController.getShareLinks);
router.delete('/share-links/:tokenId', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), documentController_1.DocumentController.revokeShareLink);
router.post('/project/:id/data-room', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), documentController_1.DocumentController.createDataRoom);
exports.default = router;
