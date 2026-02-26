import { Router } from 'express';
import { 
  validatePhoto, 
  validateUpdatePhotos, 
  processGeolocatedPhotos, 
  detectAnomalies, 
  generateVerificationReport,
  getUpdatesWithIssues
} from '../controllers/geoPhotoController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { requirePlanCapability } from '../middlewares/planEntitlements';
import { Role } from '../config/roles';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Validation routes (promoteur can validate their own photos)
router.post('/validate/project/:projectId', requirePlanCapability('geoVerification'), validatePhoto);
router.get('/validate/update/:updateId', requirePlanCapability('geoVerification'), validateUpdatePhotos);

// Photo processing (promoteur)
router.post('/process/update/:updateId', authorizeRoles(Role.PROMOTEUR), requirePlanCapability('geoVerification'), processGeolocatedPhotos);

// Anomaly detection by promoteur
router.get('/anomalies/promoteur/:promoteurId', requirePlanCapability('geoVerification'), detectAnomalies);

// Verification report by project
router.get('/report/project/:projectId', requirePlanCapability('geoVerification'), generateVerificationReport);

// Admin routes
router.get('/admin/issues', authorizeRoles(Role.ADMIN, Role.AUDITOR), getUpdatesWithIssues);

export default router;
