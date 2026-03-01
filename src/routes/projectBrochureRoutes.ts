import { Router } from 'express';
import multer from 'multer';
import { ProjectBrochureController } from '../controllers/projectBrochureController';
import { authenticateJWT } from '../middlewares/auth';
import { requirePromoteurAccess } from '../middlewares/promoteurRbac';
import { validateUpload } from '../middlewares/uploadValidation';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Public: Get project brochure (for clients)
router.get('/project/:projectId', ProjectBrochureController.getProjectBrochure);

// Track download
router.post('/project/:projectId/track-download', ProjectBrochureController.trackDownload);

// Protected: Upload brochure for project
router.post(
  '/project/:projectId/upload',
  authenticateJWT,
  requirePromoteurAccess,
  upload.single('file'),
  validateUpload({
    allowedCategories: ['document'],
    maxFileSize: 50 * 1024 * 1024, // 50MB for brochures
    requireFile: true,
    fieldName: 'file',
  }),
  ProjectBrochureController.uploadBrochure
);

// Protected: Delete brochure
router.delete(
  '/project/:projectId',
  authenticateJWT,
  requirePromoteurAccess,
  ProjectBrochureController.deleteBrochure
);

// Public: Download brochure by ID (for brochure requests)
router.get(
  '/download/:brochureId',
  ProjectBrochureController.downloadBrochure
);

export default router;
