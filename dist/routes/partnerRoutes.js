"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const partnerController_1 = require("../controllers/partnerController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Public endpoints
router.get('/', partnerController_1.PartnerController.getPartners);
router.get('/featured', partnerController_1.PartnerController.getFeaturedPartners);
router.get('/:id', partnerController_1.PartnerController.getPartner);
// Authenticated client endpoints
router.post('/request', auth_1.authenticateJWT, partnerController_1.PartnerController.createServiceRequest);
router.get('/requests/my', auth_1.authenticateJWT, partnerController_1.PartnerController.getMyServiceRequests);
router.post('/requests/:id/rate', auth_1.authenticateJWT, partnerController_1.PartnerController.rateRequest);
// Admin endpoints
router.post('/admin', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), partnerController_1.PartnerController.createPartner);
router.put('/admin/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), partnerController_1.PartnerController.updatePartner);
router.patch('/admin/:id/verify', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), partnerController_1.PartnerController.verifyPartner);
router.patch('/admin/requests/:id/assign', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), partnerController_1.PartnerController.assignRequest);
router.patch('/admin/requests/:id/complete', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), partnerController_1.PartnerController.completeRequest);
exports.default = router;
