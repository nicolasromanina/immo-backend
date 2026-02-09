import { Router } from 'express';
import { TrustScoreConfigController } from '../controllers/trustScoreConfigController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// All routes require admin access
router.use(authenticateJWT);
router.use(authorizeRoles(Role.ADMIN));

// Configuration management
router.get('/active', TrustScoreConfigController.getActiveConfig);
router.get('/', TrustScoreConfigController.getAllConfigs);
router.get('/:id', TrustScoreConfigController.getConfig);
router.post('/', TrustScoreConfigController.saveConfig);
router.patch('/:id/activate', TrustScoreConfigController.activateConfig);
router.delete('/:id', TrustScoreConfigController.deleteConfig);

// Score calculation
router.post('/calculate/:promoteurId', TrustScoreConfigController.calculateScore);
router.post('/recalculate-all', TrustScoreConfigController.recalculateAllScores);
router.get('/history/:promoteurId', TrustScoreConfigController.getScoreHistory);

export default router;
