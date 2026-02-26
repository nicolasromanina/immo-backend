import { Router } from 'express';
import { BrochureController } from '../controllers/brochureController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { requirePlanCapability } from '../middlewares/planEntitlements';
import { Role } from '../config/roles';

const router = Router();

// ==================== Public Endpoints ====================

// Request brochure (can be unauthenticated for lead capture)
router.post('/request', BrochureController.requestBrochure);

// Track email open (tracking pixel)
router.get('/track/email/:id', BrochureController.trackEmailOpen);

// Track download
router.post('/track/download/:id', BrochureController.trackDownload);

// ==================== Authenticated User Endpoints ====================  

// Send brochure via WhatsApp
router.post(
  '/:id/whatsapp',
  authenticateJWT,
  BrochureController.sendViaWhatsApp
);

// ==================== Promoteur Endpoints ====================

// Get my brochure requests
router.get(
  '/my-requests',
  authenticateJWT,
  authorizeRoles(Role.PROMOTEUR),
  requirePlanCapability('brochureAnalytics'),
  BrochureController.getMyRequests
);

// Get brochure stats
router.get(
  '/stats',
  authenticateJWT,
  authorizeRoles(Role.PROMOTEUR),
  requirePlanCapability('brochureAnalytics'),
  BrochureController.getStats
);

// Get project brochure requests
router.get(
  '/project/:projectId',
  authenticateJWT,
  authorizeRoles(Role.PROMOTEUR),
  requirePlanCapability('brochureAnalytics'),
  BrochureController.getProjectRequests
);

export default router;
