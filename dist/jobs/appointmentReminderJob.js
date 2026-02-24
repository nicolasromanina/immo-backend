"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAppointmentReminderJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const AppointmentService_1 = require("../services/AppointmentService");
const startAppointmentReminderJob = () => {
    if (process.env.APPOINTMENT_REMINDER_CRON_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.APPOINTMENT_REMINDER_CRON || '0 * * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            console.log('[Job] Appointment reminder check running...');
            const remindersSent = await AppointmentService_1.AppointmentService.sendReminders();
            console.log(`[Job] Appointment reminders sent: ${remindersSent}`);
        }
        catch (error) {
            console.error('Appointment reminder job failed:', error);
        }
    });
};
exports.startAppointmentReminderJob = startAppointmentReminderJob;
