import { Router } from 'express';
import { PartnerController } from '../controllers/partnerController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Public endpoints
router.get('/', PartnerController.getPartners);
router.get('/featured', PartnerController.getFeaturedPartners);
router.get('/:id', PartnerController.getPartner);

// Authenticated client endpoints
router.post('/request', authenticateJWT, PartnerController.createServiceRequest);
router.get('/requests/my', authenticateJWT, PartnerController.getMyServiceRequests);
router.post('/requests/:id/rate', authenticateJWT, PartnerController.rateRequest);

// Admin endpoints
router.post('/admin', authenticateJWT, authorizeRoles(Role.ADMIN), PartnerController.createPartner);
router.put('/admin/:id', authenticateJWT, authorizeRoles(Role.ADMIN), PartnerController.updatePartner);
router.patch('/admin/:id/verify', authenticateJWT, authorizeRoles(Role.ADMIN), PartnerController.verifyPartner);
router.patch('/admin/requests/:id/assign', authenticateJWT, authorizeRoles(Role.ADMIN), PartnerController.assignRequest);
router.patch('/admin/requests/:id/complete', authenticateJWT, authorizeRoles(Role.ADMIN), PartnerController.completeRequest);

export default router;
