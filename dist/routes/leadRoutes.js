"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leadController_1 = require("../controllers/leadController");
const auth_1 = require("../middlewares/auth");
const promoteurRbac_1 = require("../middlewares/promoteurRbac");
const planEntitlements_1 = require("../middlewares/planEntitlements");
const LeadTagService_1 = require("../services/LeadTagService");
const Lead_1 = __importDefault(require("../models/Lead"));
const router = (0, express_1.Router)();
// Create lead (public endpoint - anyone can submit, but capture auth if provided)
router.post('/', auth_1.authenticateJWTOptional, leadController_1.LeadController.createLead);
// Promoteur-only routes
router.get('/', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('viewLeads'), leadController_1.LeadController.getLeads);
// Specific routes BEFORE generic /:id routes
router.get('/stats/tags', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('viewLeads'), async (req, res) => {
    try {
        const promoteurId = req.user.promoteurProfile;
        if (!promoteurId) {
            return res.status(403).json({ message: 'Only promoteurs can access leads' });
        }
        const stats = await LeadTagService_1.LeadTagService.getTagStats(promoteurId.toString());
        res.json({ stats });
    }
    catch (error) {
        console.error('Error getting tag statistics:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/tags/:tag', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('viewLeads'), async (req, res) => {
    try {
        const { tag } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const promoteurId = req.user.promoteurProfile;
        if (!promoteurId) {
            return res.status(403).json({ message: 'Only promoteurs can access leads' });
        }
        const result = await LeadTagService_1.LeadTagService.getLeadsByTag(promoteurId.toString(), tag, Number(page), Number(limit));
        res.json(result);
    }
    catch (error) {
        console.error('Error getting leads by tag:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Availability + appointments
router.get('/availability/:promoteurId', auth_1.authenticateJWT, leadController_1.LeadController.getPromoteurAvailability);
router.post('/:id/appointment', auth_1.authenticateJWT, leadController_1.LeadController.scheduleAppointment);
router.get('/appointments/list', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('viewLeads'), leadController_1.LeadController.getAppointments);
router.get('/export/csv', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('exportLeads'), (0, planEntitlements_1.requirePlanCapability)('leadExport'), leadController_1.LeadController.exportLeads);
// Generic /:id routes
router.get('/:id', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('viewLeads'), leadController_1.LeadController.getLead);
router.put('/:id/status', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editLeads'), (0, planEntitlements_1.requirePlanCapability)('leadPipeline'), leadController_1.LeadController.updateLeadStatus);
router.post('/:id/note', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editLeads'), leadController_1.LeadController.addNote);
router.post('/:id/flag', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editLeads'), leadController_1.LeadController.flagAsNotSerious);
router.post('/:id/assign', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('assignLeads'), (0, planEntitlements_1.requirePlanCapability)('leadPipeline'), leadController_1.LeadController.assignLead);
// Tag management endpoints
router.post('/:id/tags/add', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editLeads'), async (req, res) => {
    try {
        const { id } = req.params;
        const { tag } = req.body;
        const promoteurId = req.user.promoteurProfile;
        if (!tag || typeof tag !== 'string') {
            return res.status(400).json({ message: 'Tag is required and must be a string' });
        }
        const lead = await Lead_1.default.findById(id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        if (lead.promoteur.toString() !== promoteurId?.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const updatedLead = await LeadTagService_1.LeadTagService.addTag(id, tag);
        res.json({ lead: updatedLead });
    }
    catch (error) {
        console.error('Error adding tag to lead:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/:id/tags/remove', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editLeads'), async (req, res) => {
    try {
        const { id } = req.params;
        const { tag } = req.body;
        const promoteurId = req.user.promoteurProfile;
        if (!tag || typeof tag !== 'string') {
            return res.status(400).json({ message: 'Tag is required and must be a string' });
        }
        const lead = await Lead_1.default.findById(id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        if (lead.promoteur.toString() !== promoteurId?.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const updatedLead = await LeadTagService_1.LeadTagService.removeTag(id, tag);
        res.json({ lead: updatedLead });
    }
    catch (error) {
        console.error('Error removing tag from lead:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
