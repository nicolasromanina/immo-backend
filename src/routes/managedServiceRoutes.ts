import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import { requirePromoteurAccess, requirePromoteurPermission } from '../middlewares/promoteurRbac';
import { requirePlanCapability } from '../middlewares/planEntitlements';
import * as managedController from '../controllers/managedServiceController';

const router = Router();

// Promoteur routes
router.post(
  '/',
  authenticateJWT,
  requirePromoteurAccess,
  requirePromoteurPermission('viewReports'),
  requirePlanCapability('managedService'),
  managedController.requestManagedService
);
router.get(
  '/my',
  authenticateJWT,
  requirePromoteurAccess,
  requirePromoteurPermission('viewReports'),
  requirePlanCapability('managedService'),
  managedController.getMyManagedServices
);

// Admin routes
router.get('/', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), managedController.getAllManagedServices);
router.put('/:id/activate', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), managedController.activateManagedService);
router.post('/:id/activity', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), managedController.logActivity);
router.put('/:id/terminate', authenticateJWT, authorizeRoles(Role.ADMIN, Role.MANAGER), managedController.terminateManagedService);

export default router;
