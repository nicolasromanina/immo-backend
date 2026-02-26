import { Router } from 'express';
import { EnterpriseContractController } from '../controllers/enterpriseContractController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { requirePlanCapability } from '../middlewares/planEntitlements';
import { Role } from '../config/roles';

const router = Router();

// ==================== Promoteur Endpoints ====================

// Get my enterprise contracts
router.get(
  '/my',
  authenticateJWT,
  authorizeRoles(Role.PROMOTEUR),
  requirePlanCapability('enterpriseContracts'),
  EnterpriseContractController.getMyContracts
);

// Get contract details
router.get(
  '/:id',
  authenticateJWT,
  requirePlanCapability('enterpriseContracts'),
  EnterpriseContractController.getContract
);

// Sign contract (promoteur side)
router.post(
  '/:id/sign',
  authenticateJWT,
  authorizeRoles(Role.PROMOTEUR),
  requirePlanCapability('enterpriseContracts'),
  EnterpriseContractController.signByPromoteur
);

// Request amendment
router.post(
  '/:id/amendment',
  authenticateJWT,
  authorizeRoles(Role.PROMOTEUR),
  requirePlanCapability('enterpriseContracts'),
  EnterpriseContractController.addAmendment
);

// ==================== Admin Endpoints ====================

// Create contract
router.post(
  '/admin',
  authenticateJWT,
  authorizeRoles(Role.ADMIN),
  EnterpriseContractController.createContract
);

// Submit for approval
router.patch(
  '/admin/:id/submit',
  authenticateJWT,
  authorizeRoles(Role.ADMIN),
  EnterpriseContractController.submitForApproval
);

// Sign contract (admin side)
router.post(
  '/admin/:id/sign',
  authenticateJWT,
  authorizeRoles(Role.ADMIN),
  EnterpriseContractController.signByAdmin
);

// Terminate contract
router.patch(
  '/admin/:id/terminate',
  authenticateJWT,
  authorizeRoles(Role.ADMIN),
  EnterpriseContractController.terminateContract
);

// Renew contract
router.patch(
  '/admin/:id/renew',
  authenticateJWT,
  authorizeRoles(Role.ADMIN),
  EnterpriseContractController.renewContract
);

// Get all contracts
router.get(
  '/admin/all',
  authenticateJWT,
  authorizeRoles(Role.ADMIN, Role.SUPPORT),
  EnterpriseContractController.getAllContracts
);

// Get expiring contracts
router.get(
  '/admin/expiring',
  authenticateJWT,
  authorizeRoles(Role.ADMIN, Role.SUPPORT),
  EnterpriseContractController.getExpiringContracts
);

export default router;
