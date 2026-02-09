import { Router } from 'express';
import { AppointmentController } from '../controllers/appointmentController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Public: Get available slots for a project
router.get('/slots/:projectId', AppointmentController.getAvailableSlots);

// Authenticated user endpoints
router.post('/', authenticateJWT, AppointmentController.createAppointment);
router.get('/upcoming', authenticateJWT, AppointmentController.getUpcomingAppointments);
router.get('/:id', authenticateJWT, AppointmentController.getAppointment);
router.patch('/:id/cancel', authenticateJWT, AppointmentController.cancelAppointment);
router.get('/:id/calendar', authenticateJWT, AppointmentController.getCalendarLink);

// Promoteur endpoints
router.get('/project/:projectId', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), AppointmentController.getProjectAppointments);
router.patch('/:id/confirm', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), AppointmentController.confirmAppointment);
router.patch('/:id/complete', authenticateJWT, authorizeRoles(Role.PROMOTEUR, Role.ADMIN), AppointmentController.completeAppointment);

export default router;
