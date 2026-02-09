import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import * as supportController from '../controllers/supportController';

const router = Router();

// User routes
router.post('/', authenticateJWT, supportController.createTicket);
router.get('/my', authenticateJWT, supportController.getMyTickets);
router.get('/:id', authenticateJWT, supportController.getTicketById);
router.post('/:id/reply', authenticateJWT, supportController.replyToTicket);
router.post('/:id/rate', authenticateJWT, supportController.rateTicket);

// Admin routes
router.get('/', authenticateJWT, authorizeRoles(Role.ADMIN, Role.SUPPORT), supportController.getAllTickets);
router.put('/:id/assign', authenticateJWT, authorizeRoles(Role.ADMIN, Role.SUPPORT), supportController.assignTicket);
router.put('/:id/resolve', authenticateJWT, authorizeRoles(Role.ADMIN, Role.SUPPORT), supportController.resolveTicket);
router.put('/:id/close', authenticateJWT, authorizeRoles(Role.ADMIN, Role.SUPPORT), supportController.closeTicket);

export default router;
