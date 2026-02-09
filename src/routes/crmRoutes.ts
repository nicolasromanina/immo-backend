import { Router } from 'express';
import { CRMController } from '../controllers/crmController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

router.get('/config', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), CRMController.getConfig);
router.put('/config', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), CRMController.updateConfig);

export default router;
