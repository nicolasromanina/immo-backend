import { Router } from 'express';
import { MediaController } from '../controllers/mediaController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { requirePlanCapability } from '../middlewares/planEntitlements';
import { Role } from '../config/roles';

const router = Router();

router.post('/cloudinary/signature', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), requirePlanCapability('mediaAccess'), MediaController.getCloudinarySignature);

export default router;
