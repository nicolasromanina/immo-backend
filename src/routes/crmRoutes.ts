import { Router } from 'express';
import { CRMController } from '../controllers/crmController';
import { authenticateJWT } from '../middlewares/auth';
import { requirePromoteurAccess, requirePromoteurPermission } from '../middlewares/promoteurRbac';
import { requirePlanCapability } from '../middlewares/planEntitlements';

const router = Router();

router.get('/config', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editSettings'), requirePlanCapability('crmIntegration'), CRMController.getConfig);
router.put('/config', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editSettings'), requirePlanCapability('crmIntegration'), CRMController.updateConfig);

export default router;
