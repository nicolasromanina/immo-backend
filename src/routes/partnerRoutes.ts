import { Router } from 'express';
import multer from 'multer';
import { PartnerController } from '../controllers/partnerController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import path from 'path';

const router = Router();
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = `partner-logo-${Date.now()}`;
    cb(null, base + ext);
  },
});
const upload = multer({ storage });

// Public endpoints
router.get('/', PartnerController.getPartners);
router.get('/featured', PartnerController.getFeaturedPartners);
router.get('/admin', authenticateJWT, authorizeRoles(Role.ADMIN), PartnerController.getPartnersAdmin);
router.get('/:id', PartnerController.getPartner);

// Authenticated client endpoints
router.post('/request', authenticateJWT, PartnerController.createServiceRequest);
router.get('/requests/my', authenticateJWT, PartnerController.getMyServiceRequests);
router.post('/requests/:id/rate', authenticateJWT, PartnerController.rateRequest);

// Admin endpoints
router.post('/admin/upload-logo', authenticateJWT, authorizeRoles(Role.ADMIN), upload.single('file'), PartnerController.uploadLogo);
router.post('/admin', authenticateJWT, authorizeRoles(Role.ADMIN), PartnerController.createPartner);
router.put('/admin/:id', authenticateJWT, authorizeRoles(Role.ADMIN), PartnerController.updatePartner);
router.patch('/admin/:id/verify', authenticateJWT, authorizeRoles(Role.ADMIN), PartnerController.verifyPartner);
router.patch('/admin/requests/:id/assign', authenticateJWT, authorizeRoles(Role.ADMIN), PartnerController.assignRequest);
router.patch('/admin/requests/:id/complete', authenticateJWT, authorizeRoles(Role.ADMIN), PartnerController.completeRequest);

export default router;
