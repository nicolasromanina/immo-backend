import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth';
import teamManagementController from '../controllers/teamManagementController';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Get team members
router.get('/members', teamManagementController.getTeamMembers);

// Create/update team role
router.post('/roles', teamManagementController.createTeamRole);

// Assign lead to team member
router.post('/assign-lead', teamManagementController.assignLead);

// Get team activity log
router.get('/activity-log', teamManagementController.getTeamActivityLog);

// Get team member assignments
router.get('/assignments/:userId', teamManagementController.getTeamMemberAssignments);

// Get member modification history
router.get('/history/:userId', teamManagementController.getMemberModificationHistory);

// Update team member role
router.put('/member-role', teamManagementController.updateTeamMemberRole);

export default router;
