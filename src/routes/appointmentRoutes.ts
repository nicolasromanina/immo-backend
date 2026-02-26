import { Router } from 'express';
import { AppointmentController } from '../controllers/appointmentController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { requirePlanCapability } from '../middlewares/planEntitlements';
import { Role } from '../config/roles';

const router = Router();

// Public: Get available slots for a project
router.get('/slots/:projectId', AppointmentController.getAvailableSlots);

// Authenticated user endpoints
router.post('/', authenticateJWT, requirePlanCapability('calendarAppointments'), AppointmentController.createAppointment);
router.get('/upcoming', authenticateJWT, requirePlanCapability('calendarAppointments'), AppointmentController.getUpcomingAppointments);
router.get('/:id', authenticateJWT, requirePlanCapability('calendarAppointments'), AppointmentController.getAppointment);
router.patch('/:id/cancel', authenticateJWT, requirePlanCapability('calendarAppointments'), AppointmentController.cancelAppointment);
router.get('/:id/calendar', authenticateJWT, requirePlanCapability('calendarAppointments'), AppointmentController.getCalendarLink);

// Promoteur endpoints
router.get('/project/:projectId', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), requirePlanCapability('calendarAppointments'), AppointmentController.getProjectAppointments);
router.patch('/:id/confirm', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), requirePlanCapability('calendarAppointments'), AppointmentController.confirmAppointment);
router.patch('/:id/complete', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), requirePlanCapability('calendarAppointments'), AppointmentController.completeAppointment);

export default router;
