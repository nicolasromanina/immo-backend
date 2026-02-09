import { Router } from 'express';
import * as openGraphController from '../controllers/openGraphController';

const router = Router();

// Public routes — these generate OG data for sharing
router.get('/project/:projectId', openGraphController.getProjectOG);
router.get('/project/:projectId/meta', openGraphController.getProjectMetaTags);
router.get('/project/:projectId/share', openGraphController.getShareLinks);

export default router;
