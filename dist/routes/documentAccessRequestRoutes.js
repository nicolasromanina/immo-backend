"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentAccessRequestController_1 = require("../controllers/documentAccessRequestController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Client routes - request access
router.post('/request', auth_1.authenticateJWT, documentAccessRequestController_1.DocumentAccessRequestController.requestDocumentAccess);
// Promoteur routes - manage requests
router.get('/promoteur/pending', auth_1.authenticateJWT, documentAccessRequestController_1.DocumentAccessRequestController.getPendingRequests);
router.get('/promoteur', auth_1.authenticateJWT, documentAccessRequestController_1.DocumentAccessRequestController.getAllRequests);
router.get('/:requestId', auth_1.authenticateJWT, documentAccessRequestController_1.DocumentAccessRequestController.getRequestDetails);
// Promoteur routes - approve/deny
router.post('/:requestId/approve', auth_1.authenticateJWT, documentAccessRequestController_1.DocumentAccessRequestController.grantAccess);
router.post('/:requestId/deny', auth_1.authenticateJWT, documentAccessRequestController_1.DocumentAccessRequestController.denyAccess);
exports.default = router;
