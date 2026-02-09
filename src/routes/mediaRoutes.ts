import { Router } from 'express';
import { MediaController } from '../controllers/mediaController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

router.post('/cloudinary/signature', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), MediaController.getCloudinarySignature);

export default router;
