"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startInvoiceReminderJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const InvoiceService_1 = require("../services/InvoiceService");
const startInvoiceReminderJob = () => {
    if (process.env.INVOICE_REMINDER_CRON_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.INVOICE_REMINDER_CRON || '0 10 * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            console.log('[Job] Invoice reminder check running...');
            const remindersSent = await InvoiceService_1.InvoiceService.sendPaymentReminders();
            console.log(`[Job] Invoice reminders sent: ${remindersSent}`);
        }
        catch (error) {
            console.error('Invoice reminder job failed:', error);
        }
    });
};
exports.startInvoiceReminderJob = startInvoiceReminderJob;
