import { Router } from 'express';
import { GDPRController } from '../controllers/gdprController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// User GDPR rights endpoints
router.post('/request', authenticateJWT, GDPRController.createRequest);
router.get('/my-data', authenticateJWT, GDPRController.getMyData);
router.get('/export', authenticateJWT, GDPRController.exportMyData);

// Consent management
router.get('/consent', authenticateJWT, GDPRController.getMyConsents);
router.put('/consent', authenticateJWT, GDPRController.updateConsent);
router.put('/cookies', authenticateJWT, GDPRController.updateCookiePreferences);

// Admin endpoints
router.get('/admin/requests', authenticateJWT, authorizeRoles(Role.ADMIN, Role.SUPPORT), GDPRController.getRequests);
router.post('/admin/erasure/:id', authenticateJWT, authorizeRoles(Role.ADMIN), GDPRController.processErasureRequest);
router.post('/admin/access/:id', authenticateJWT, authorizeRoles(Role.ADMIN), GDPRController.processAccessRequest);

export default router;
