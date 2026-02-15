import { Router } from 'express';
import { LeadController } from '../controllers/leadController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Create lead (public endpoint - anyone can submit)
router.post('/', LeadController.createLead);

// Promoteur-only routes
router.get('/', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), LeadController.getLeads);

// Availability + appointments
router.get('/availability/:promoteurId', authenticateJWT, LeadController.getPromoteurAvailability);
router.post('/:id/appointment', authenticateJWT, LeadController.scheduleAppointment);
router.get('/appointments/list', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), LeadController.getAppointments);
router.get('/export/csv', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), LeadController.exportLeads);
router.get('/:id', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), LeadController.getLead);
router.put('/:id/status', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), LeadController.updateLeadStatus);
router.post('/:id/note', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), LeadController.addNote);
router.post('/:id/flag', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), LeadController.flagAsNotSerious);
router.post('/:id/assign', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), LeadController.assignLead);

export default router;
