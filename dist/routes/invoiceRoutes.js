"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invoiceController_1 = require("../controllers/invoiceController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Promoteur endpoints
router.get('/my', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), invoiceController_1.InvoiceController.getMyInvoices);
router.get('/:id', auth_1.authenticateJWT, invoiceController_1.InvoiceController.getInvoice);
// Admin endpoints
router.get('/admin/all', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), invoiceController_1.InvoiceController.getAllInvoices);
router.get('/admin/overdue', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), invoiceController_1.InvoiceController.getOverdueInvoices);
router.post('/admin', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), invoiceController_1.InvoiceController.createInvoice);
router.post('/admin/onboarding', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), invoiceController_1.InvoiceController.createOnboardingInvoice);
router.patch('/admin/:id/paid', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), invoiceController_1.InvoiceController.markAsPaid);
router.patch('/admin/:id/failed', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), invoiceController_1.InvoiceController.markAsFailed);
router.post('/admin/:id/refund', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), invoiceController_1.InvoiceController.refundInvoice);
router.post('/admin/reminders', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), invoiceController_1.InvoiceController.sendPaymentReminders);
exports.default = router;
