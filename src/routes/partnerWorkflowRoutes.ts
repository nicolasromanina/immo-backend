import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import * as pwc from '../controllers/partnerWorkflowController';

const router = Router();

// Courtier workflows
router.post('/courtier/:leadId/pre-qualify', authenticateJWT, pwc.preQualifyLead);
router.get('/courtier/:courtierId/stats', authenticateJWT, pwc.getCourtierStats);

// Architecte workflows
router.post('/architecte/:partnerId/portfolio', authenticateJWT, pwc.submitPortfolio);
router.post('/architecte/:partnerId/devis', authenticateJWT, pwc.requestDevis);
router.put('/architecte/devis/:requestId', authenticateJWT, pwc.submitDevis);

// Notaire workflows
router.post('/notaire/:partnerId/consultation', authenticateJWT, pwc.requestConsultation);
router.post('/notaire/consultation/:requestId/schedule', authenticateJWT, pwc.scheduleNotaireAppointment);
router.put('/notaire/consultation/:requestId/report', authenticateJWT, pwc.submitConsultationReport);
router.get('/notaire/:partnerId/availability', authenticateJWT, pwc.getNotaireAvailability);

export default router;
