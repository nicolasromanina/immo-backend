import { Router, Response } from 'express';
import { LeadController } from '../controllers/leadController';
import { authenticateJWT, authenticateJWTOptional, AuthRequest } from '../middlewares/auth';
import { requirePromoteurAccess, requirePromoteurPermission } from '../middlewares/promoteurRbac';
import { requirePlanCapability } from '../middlewares/planEntitlements';
import { LeadTagService } from '../services/LeadTagService';
import User from '../models/User';
import Lead from '../models/Lead';

const router = Router();

// Create lead (public endpoint - anyone can submit, but capture auth if provided)
router.post('/', authenticateJWTOptional, LeadController.createLead);

// Promoteur-only routes
router.get('/', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewLeads'), LeadController.getLeads);

// Specific routes BEFORE generic /:id routes
router.get('/stats/tags', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewLeads'), async (req: AuthRequest, res: Response) => {
  try {
    const promoteurId = req.user!.promoteurProfile;

    if (!promoteurId) {
      return res.status(403).json({ message: 'Only promoteurs can access leads' });
    }

    const stats = await LeadTagService.getTagStats(promoteurId.toString());
    res.json({ stats });
  } catch (error) {
    console.error('Error getting tag statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/tags/:tag', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewLeads'), async (req: AuthRequest, res: Response) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const promoteurId = req.user!.promoteurProfile;

    if (!promoteurId) {
      return res.status(403).json({ message: 'Only promoteurs can access leads' });
    }

    const result = await LeadTagService.getLeadsByTag(
      promoteurId.toString(),
      tag,
      Number(page),
      Number(limit)
    );

    res.json(result);
  } catch (error) {
    console.error('Error getting leads by tag:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Availability + appointments
router.get('/availability/:promoteurId', authenticateJWT, LeadController.getPromoteurAvailability);
router.post('/:id/appointment', authenticateJWT, LeadController.scheduleAppointment);
router.get('/appointments/list', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewLeads'), LeadController.getAppointments);
router.get('/export/csv', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('exportLeads'), requirePlanCapability('leadExport'), LeadController.exportLeads);

// Generic /:id routes
router.get('/:id', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('viewLeads'), LeadController.getLead);
router.put('/:id/status', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editLeads'), requirePlanCapability('leadPipeline'), LeadController.updateLeadStatus);
router.post('/:id/note', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editLeads'), LeadController.addNote);
router.post('/:id/flag', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editLeads'), LeadController.flagAsNotSerious);
router.post('/:id/assign', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('assignLeads'), requirePlanCapability('leadPipeline'), LeadController.assignLead);

// Tag management endpoints
router.post('/:id/tags/add', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editLeads'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tag } = req.body;
    const promoteurId = req.user!.promoteurProfile;

    if (!tag || typeof tag !== 'string') {
      return res.status(400).json({ message: 'Tag is required and must be a string' });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.promoteur.toString() !== promoteurId?.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedLead = await LeadTagService.addTag(id, tag);
    res.json({ lead: updatedLead });
  } catch (error) {
    console.error('Error adding tag to lead:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/tags/remove', authenticateJWT, requirePromoteurAccess, requirePromoteurPermission('editLeads'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tag } = req.body;
    const promoteurId = req.user!.promoteurProfile;

    if (!tag || typeof tag !== 'string') {
      return res.status(400).json({ message: 'Tag is required and must be a string' });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.promoteur.toString() !== promoteurId?.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedLead = await LeadTagService.removeTag(id, tag);
    res.json({ lead: updatedLead });
  } catch (error) {
    console.error('Error removing tag from lead:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
