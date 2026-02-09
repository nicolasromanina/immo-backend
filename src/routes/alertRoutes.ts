import { Router } from 'express';
import { AlertController } from '../controllers/alertController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';

const router = Router();

router.post('/', authenticateJWT, AlertController.create);
router.get('/my-alerts', authenticateJWT, AlertController.getMyAlerts);
router.get('/preferences', authenticateJWT, AlertController.getActivePreferences);
router.put('/:id', authenticateJWT, AlertController.update);
router.post('/:id/read', authenticateJWT, AlertController.markAsRead);
router.post('/read-all', authenticateJWT, AlertController.markAllAsRead);
router.post('/:id/toggle', authenticateJWT, AlertController.toggle);
router.delete('/:id', authenticateJWT, AlertController.delete);

export default router;
