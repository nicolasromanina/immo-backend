"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const appointmentController_1 = require("../controllers/appointmentController");
const auth_1 = require("../middlewares/auth");
const promoteurRbac_1 = require("../middlewares/promoteurRbac");
const planEntitlements_1 = require("../middlewares/planEntitlements");
const router = (0, express_1.Router)();
// Public: Get available slots for a project
router.get('/slots/:projectId', appointmentController_1.AppointmentController.getAvailableSlots);
// Authenticated user endpoints
router.post('/', auth_1.authenticateJWT, (0, planEntitlements_1.requirePlanCapability)('calendarAppointments'), appointmentController_1.AppointmentController.createAppointment);
router.get('/upcoming', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, planEntitlements_1.requirePlanCapability)('calendarAppointments'), appointmentController_1.AppointmentController.getUpcomingAppointments);
router.get('/:id', auth_1.authenticateJWT, (0, planEntitlements_1.requirePlanCapability)('calendarAppointments'), appointmentController_1.AppointmentController.getAppointment);
router.patch('/:id/cancel', auth_1.authenticateJWT, (0, planEntitlements_1.requirePlanCapability)('calendarAppointments'), appointmentController_1.AppointmentController.cancelAppointment);
router.get('/:id/calendar', auth_1.authenticateJWT, (0, planEntitlements_1.requirePlanCapability)('calendarAppointments'), appointmentController_1.AppointmentController.getCalendarLink);
// Promoteur endpoints (for owners and team members)
router.get('/project/:projectId', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, planEntitlements_1.requirePlanCapability)('calendarAppointments'), appointmentController_1.AppointmentController.getProjectAppointments);
router.patch('/:id/confirm', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, planEntitlements_1.requirePlanCapability)('calendarAppointments'), appointmentController_1.AppointmentController.confirmAppointment);
router.patch('/:id/complete', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, planEntitlements_1.requirePlanCapability)('calendarAppointments'), appointmentController_1.AppointmentController.completeAppointment);
exports.default = router;
