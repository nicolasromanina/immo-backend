"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const enterpriseContractController_1 = require("../controllers/enterpriseContractController");
const auth_1 = require("../middlewares/auth");
const planEntitlements_1 = require("../middlewares/planEntitlements");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// ==================== Promoteur Endpoints ====================
// Get my enterprise contracts
router.get('/my', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), (0, planEntitlements_1.requirePlanCapability)('enterpriseContracts'), enterpriseContractController_1.EnterpriseContractController.getMyContracts);
// Get contract details
router.get('/:id', auth_1.authenticateJWT, (0, planEntitlements_1.requirePlanCapability)('enterpriseContracts'), enterpriseContractController_1.EnterpriseContractController.getContract);
// Sign contract (promoteur side)
router.post('/:id/sign', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), (0, planEntitlements_1.requirePlanCapability)('enterpriseContracts'), enterpriseContractController_1.EnterpriseContractController.signByPromoteur);
// Request amendment
router.post('/:id/amendment', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), (0, planEntitlements_1.requirePlanCapability)('enterpriseContracts'), enterpriseContractController_1.EnterpriseContractController.addAmendment);
// ==================== Admin Endpoints ====================
// Create contract
router.post('/admin', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), enterpriseContractController_1.EnterpriseContractController.createContract);
// Submit for approval
router.patch('/admin/:id/submit', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), enterpriseContractController_1.EnterpriseContractController.submitForApproval);
// Sign contract (admin side)
router.post('/admin/:id/sign', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), enterpriseContractController_1.EnterpriseContractController.signByAdmin);
// Terminate contract
router.patch('/admin/:id/terminate', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), enterpriseContractController_1.EnterpriseContractController.terminateContract);
// Renew contract
router.patch('/admin/:id/renew', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), enterpriseContractController_1.EnterpriseContractController.renewContract);
// Get all contracts
router.get('/admin/all', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), enterpriseContractController_1.EnterpriseContractController.getAllContracts);
// Get expiring contracts
router.get('/admin/expiring', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), enterpriseContractController_1.EnterpriseContractController.getExpiringContracts);
exports.default = router;
