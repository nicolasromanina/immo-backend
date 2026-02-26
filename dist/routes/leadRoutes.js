"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leadController_1 = require("../controllers/leadController");
const auth_1 = require("../middlewares/auth");
const promoteurRbac_1 = require("../middlewares/promoteurRbac");
const planEntitlements_1 = require("../middlewares/planEntitlements");
const router = (0, express_1.Router)();
// Create lead (public endpoint - anyone can submit, but capture auth if provided)
router.post('/', auth_1.authenticateJWTOptional, leadController_1.LeadController.createLead);
// Promoteur-only routes
router.get('/', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('viewLeads'), leadController_1.LeadController.getLeads);
// Availability + appointments
router.get('/availability/:promoteurId', auth_1.authenticateJWT, leadController_1.LeadController.getPromoteurAvailability);
router.post('/:id/appointment', auth_1.authenticateJWT, leadController_1.LeadController.scheduleAppointment);
router.get('/appointments/list', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('viewLeads'), leadController_1.LeadController.getAppointments);
router.get('/export/csv', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('exportLeads'), (0, planEntitlements_1.requirePlanCapability)('leadExport'), leadController_1.LeadController.exportLeads);
router.get('/:id', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('viewLeads'), leadController_1.LeadController.getLead);
router.put('/:id/status', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editLeads'), (0, planEntitlements_1.requirePlanCapability)('leadPipeline'), leadController_1.LeadController.updateLeadStatus);
router.post('/:id/note', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editLeads'), leadController_1.LeadController.addNote);
router.post('/:id/flag', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editLeads'), leadController_1.LeadController.flagAsNotSerious);
router.post('/:id/assign', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('assignLeads'), (0, planEntitlements_1.requirePlanCapability)('leadPipeline'), leadController_1.LeadController.assignLead);
exports.default = router;
