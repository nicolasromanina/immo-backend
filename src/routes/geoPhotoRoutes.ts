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
import { Role } from '../config/roles';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Validation routes (promoteur can validate their own photos)
router.post('/validate/project/:projectId', validatePhoto);
router.get('/validate/update/:updateId', validateUpdatePhotos);

// Photo processing (promoteur)
router.post('/process/update/:updateId', authorizeRoles(Role.PROMOTEUR), processGeolocatedPhotos);

// Anomaly detection by promoteur
router.get('/anomalies/promoteur/:promoteurId', detectAnomalies);

// Verification report by project
router.get('/report/project/:projectId', generateVerificationReport);

// Admin routes
router.get('/admin/issues', authorizeRoles(Role.ADMIN, Role.AUDITOR), getUpdatesWithIssues);

export default router;
