import { Router } from 'express';
import multer from 'multer';
import { ProjectController } from '../controllers/projectController';
import { authenticateJWT } from '../middlewares/auth';
import { requirePromoteurAccess, requirePromoteurPermission } from '../middlewares/promoteurRbac';
import { validateUpload } from '../middlewares/uploadValidation';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Public routes (no auth required)
router.get('/', ProjectController.getProjects);
router.get('/featured', ProjectController.getFeaturedProjects);
router.get('/top-verified', ProjectController.getTopVerifiedProjects);
router.get('/:identifier', ProjectController.getProject);
router.get('/:id/media/:mediaType', ProjectController.getProjectMedia);

// Protected routes
router.post('/', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('createProjects'), ProjectController.createProject);
router.put('/:id', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), ProjectController.updateProject);
router.get('/:id/changes-log', authenticateJWT, ProjectController.getChangesLog);
router.delete('/:id', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('deleteProjects'), ProjectController.deleteProject);
router.post('/:id/submit', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), ProjectController.submitForPublication);

// Media management
router.post('/:id/media/cover',
  authenticateJWT,
  requirePromoteurAccess,
  requirePromoteurPermission('editProjects'),
  upload.single('file'),
  validateUpload({ allowedCategories: ['image'], maxFileSize: 20 * 1024 * 1024, requireFile: true, fieldName: 'file' }),
  ProjectController.setProjectCoverImage
);
router.post('/:id/media/:mediaType', 
  authenticateJWT, 
  requirePromoteurAccess,
  requirePromoteurPermission('editProjects'),
  upload.single('file'),
  ProjectController.addProjectMedia
);
router.delete('/:id/media/:mediaType', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), ProjectController.removeProjectMedia);

// Team assignment
router.get('/:id/team', ProjectController.getAssignedTeam);
router.post('/:id/team', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editTeam'), ProjectController.assignTeamMember);
router.delete('/:id/team', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editTeam'), ProjectController.removeTeamMember);

// Promoteur's own projects
router.get('/my/list', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewProjects'), ProjectController.getMyProjects);

// FAQ
router.post('/:id/faq', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), ProjectController.addFAQ);

// Delays & Risks
router.post('/:id/delay', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), ProjectController.reportDelay);
router.post('/:id/risk', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), ProjectController.reportRisk);

// Pause / Resume
router.patch('/:id/pause', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), ProjectController.pauseProject);
router.patch('/:id/resume', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editProjects'), ProjectController.resumeProject);
router.get('/:id/pause-history', ProjectController.getPauseHistory);

export default router;
