"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const securityIncidentController_1 = require("../controllers/securityIncidentController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// All routes require admin/support access
router.use(auth_1.authenticateJWT);
router.use((0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT));
// Incident CRUD
router.post('/', securityIncidentController_1.SecurityIncidentController.createIncident);
router.get('/', securityIncidentController_1.SecurityIncidentController.getIncidents);
router.get('/active/count', securityIncidentController_1.SecurityIncidentController.getActiveCount);
router.get('/critical', securityIncidentController_1.SecurityIncidentController.getCriticalIncidents);
router.get('/:id', securityIncidentController_1.SecurityIncidentController.getIncident);
// Status and updates
router.patch('/:id/status', securityIncidentController_1.SecurityIncidentController.updateStatus);
router.post('/:id/notes', securityIncidentController_1.SecurityIncidentController.addNote);
router.post('/:id/actions', securityIncidentController_1.SecurityIncidentController.addResponseAction);
// Investigation
router.post('/:id/investigator', securityIncidentController_1.SecurityIncidentController.assignInvestigator);
router.patch('/:id/root-cause', securityIncidentController_1.SecurityIncidentController.setRootCause);
// Notifications and reporting
router.post('/:id/notify', securityIncidentController_1.SecurityIncidentController.notifyUsers);
router.post('/:id/regulatory-report', securityIncidentController_1.SecurityIncidentController.submitRegulatoryReport);
exports.default = router;
