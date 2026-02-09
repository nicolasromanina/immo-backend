import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Promoteur endpoints
router.get('/my', authenticateJWT, authorizeRoles(Role.PROMOTEUR), InvoiceController.getMyInvoices);
router.get('/:id', authenticateJWT, InvoiceController.getInvoice);

// Admin endpoints
router.get('/admin/all', authenticateJWT, authorizeRoles(Role.ADMIN, Role.SUPPORT), InvoiceController.getAllInvoices);
router.get('/admin/overdue', authenticateJWT, authorizeRoles(Role.ADMIN, Role.SUPPORT), InvoiceController.getOverdueInvoices);
router.post('/admin', authenticateJWT, authorizeRoles(Role.ADMIN), InvoiceController.createInvoice);
router.post('/admin/onboarding', authenticateJWT, authorizeRoles(Role.ADMIN), InvoiceController.createOnboardingInvoice);
router.patch('/admin/:id/paid', authenticateJWT, authorizeRoles(Role.ADMIN), InvoiceController.markAsPaid);
router.patch('/admin/:id/failed', authenticateJWT, authorizeRoles(Role.ADMIN), InvoiceController.markAsFailed);
router.post('/admin/:id/refund', authenticateJWT, authorizeRoles(Role.ADMIN), InvoiceController.refundInvoice);
router.post('/admin/reminders', authenticateJWT, authorizeRoles(Role.ADMIN), InvoiceController.sendPaymentReminders);

export default router;
