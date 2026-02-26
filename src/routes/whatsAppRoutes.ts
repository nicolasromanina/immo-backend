import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsAppController';
import { authenticateJWT } from '../middlewares/auth';
import { requirePromoteurAccess, requirePromoteurPermission } from '../middlewares/promoteurRbac';
import { requirePlanCapability } from '../middlewares/planEntitlements';

const router = Router();

router.post(
  '/send',
  authenticateJWT,
  requirePromoteurAccess,
  requirePromoteurPermission('editLeads'),
  requirePlanCapability('whatsAppTemplates'),
  WhatsAppController.sendToLead
);
router.get(
  '/lead/:leadId',
  authenticateJWT,
  requirePromoteurAccess,
  requirePromoteurPermission('viewLeads'),
  requirePlanCapability('whatsAppTemplates'),
  WhatsAppController.getLeadMessages
);

export default router;
