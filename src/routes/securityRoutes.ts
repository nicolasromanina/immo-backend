import { Router } from 'express';
import { SecurityIncidentController } from '../controllers/securityIncidentController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// All routes require admin/support access
router.use(authenticateJWT);
router.use(authorizeRoles(Role.ADMIN, Role.SUPPORT));

// Incident CRUD
router.post('/', SecurityIncidentController.createIncident);
router.get('/', SecurityIncidentController.getIncidents);
router.get('/active/count', SecurityIncidentController.getActiveCount);
router.get('/critical', SecurityIncidentController.getCriticalIncidents);
router.get('/:id', SecurityIncidentController.getIncident);

// Status and updates
router.patch('/:id/status', SecurityIncidentController.updateStatus);
router.post('/:id/notes', SecurityIncidentController.addNote);
router.post('/:id/actions', SecurityIncidentController.addResponseAction);

// Investigation
router.post('/:id/investigator', SecurityIncidentController.assignInvestigator);
router.patch('/:id/root-cause', SecurityIncidentController.setRootCause);

// Notifications and reporting
router.post('/:id/notify', SecurityIncidentController.notifyUsers);
router.post('/:id/regulatory-report', SecurityIncidentController.submitRegulatoryReport);

export default router;
