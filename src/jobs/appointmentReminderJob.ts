import cron from 'node-cron';
import { AppointmentService } from '../services/AppointmentService';

export const startAppointmentReminderJob = () => {
  if (process.env.APPOINTMENT_REMINDER_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.APPOINTMENT_REMINDER_CRON || '0 * * * *';

  cron.schedule(schedule, async () => {
    try {
      console.log('[Job] Appointment reminder check running...');
      const remindersSent = await AppointmentService.sendReminders();
      console.log(`[Job] Appointment reminders sent: ${remindersSent}`);
    } catch (error) {
      console.error('Appointment reminder job failed:', error);
    }
  });
};
