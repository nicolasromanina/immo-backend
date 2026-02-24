import { Router } from 'express';
import { LeadController } from '../controllers/leadController';
import { authenticateJWT, authenticateJWTOptional } from '../middlewares/auth';
import { requirePromoteurAccess, requirePromoteurPermission } from '../middlewares/promoteurRbac';

const router = Router();

// Create lead (public endpoint - anyone can submit, but capture auth if provided)
router.post('/', authenticateJWTOptional, LeadController.createLead);

// Promoteur-only routes
router.get('/', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewLeads'), LeadController.getLeads);

// Availability + appointments
router.get('/availability/:promoteurId', authenticateJWT, LeadController.getPromoteurAvailability);
router.post('/:id/appointment', authenticateJWT, LeadController.scheduleAppointment);
router.get('/appointments/list', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewLeads'), LeadController.getAppointments);
router.get('/export/csv', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('exportLeads'), LeadController.exportLeads);
router.get('/:id', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewLeads'), LeadController.getLead);
router.put('/:id/status', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editLeads'), LeadController.updateLeadStatus);
router.post('/:id/note', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editLeads'), LeadController.addNote);
router.post('/:id/flag', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editLeads'), LeadController.flagAsNotSerious);
router.post('/:id/assign', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('assignLeads'), LeadController.assignLead);

export default router;
