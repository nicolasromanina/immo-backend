import cron from 'node-cron';
import { InvoiceService } from '../services/InvoiceService';

export const startInvoiceReminderJob = () => {
  if (process.env.INVOICE_REMINDER_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.INVOICE_REMINDER_CRON || '0 10 * * *';

  cron.schedule(schedule, async () => {
    try {
      console.log('[Job] Invoice reminder check running...');
      const remindersSent = await InvoiceService.sendPaymentReminders();
      console.log(`[Job] Invoice reminders sent: ${remindersSent}`);
    } catch (error) {
      console.error('Invoice reminder job failed:', error);
    }
  });
};
