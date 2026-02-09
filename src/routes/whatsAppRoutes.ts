import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsAppController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

router.post('/send', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), WhatsAppController.sendToLead);
router.get('/lead/:leadId', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), WhatsAppController.getLeadMessages);

export default router;
