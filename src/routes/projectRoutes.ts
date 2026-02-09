import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Public routes (no auth required)
router.get('/', ProjectController.getProjects);
router.get('/featured', ProjectController.getFeaturedProjects);
router.get('/top-verified', ProjectController.getTopVerifiedProjects);
router.get('/:identifier', ProjectController.getProject);
router.get('/:id/media/:mediaType', ProjectController.getProjectMedia);

// Protected routes
router.post('/', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.createProject);
router.put('/:id', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.updateProject);
router.get('/:id/changes-log', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN, Role.USER), ProjectController.getChangesLog);
router.delete('/:id', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.deleteProject);
router.post('/:id/submit', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.submitForPublication);

// Media management
router.post('/:id/media/cover', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.setProjectCoverImage);
router.post('/:id/media/:mediaType', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.addProjectMedia);
router.delete('/:id/media/:mediaType', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.removeProjectMedia);

// Team assignment
router.get('/:id/team', ProjectController.getAssignedTeam);
router.post('/:id/team', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.assignTeamMember);
router.delete('/:id/team', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.removeTeamMember);

// Promoteur's own projects
router.get('/my/list', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.getMyProjects);

// FAQ
router.post('/:id/faq', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.addFAQ);

// Delays & Risks
router.post('/:id/delay', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.reportDelay);
router.post('/:id/risk', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.reportRisk);

// Pause / Resume
router.patch('/:id/pause', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.pauseProject);
router.patch('/:id/resume', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), ProjectController.resumeProject);
router.get('/:id/pause-history', ProjectController.getPauseHistory);

export default router;
