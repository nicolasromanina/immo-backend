"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentService = void 0;
const Appointment_1 = __importDefault(require("../models/Appointment"));
const Availability_1 = __importDefault(require("../models/Availability"));
const Lead_1 = __importDefault(require("../models/Lead"));
const Project_1 = __importDefault(require("../models/Project"));
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const NotificationService_1 = require("./NotificationService");
const PlanLimitService_1 = require("./PlanLimitService");
class AppointmentService {
    static buildTicketDate(ticket) {
        const date = ticket.appointmentDate || '';
        const time = ticket.appointmentTime || '00:00';
        const parsed = new Date(`${date}T${time}:00`);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
        return new Date(ticket.createdAt);
    }
    static async getPublicAppointmentRequests(promoteurId, from, to) {
        const projects = await Project_1.default.find({ promoteur: promoteurId })
            .select('_id title')
            .lean();
        if (!projects.length) {
            return [];
        }
        const projectTitleById = new Map(projects.map((project) => [project._id.toString(), project.title || 'Projet']));
        const projectIds = [...projectTitleById.keys()];
        const tickets = await SupportTicket_1.default.find({
            category: 'appointment_request',
            projectId: { $in: projectIds },
            status: { $in: ['open', 'in-progress', 'waiting-user', 'waiting-admin'] },
        })
            .select('_id ticketNumber submitterName submitterEmail submitterPhone appointmentDate appointmentTime projectId description createdAt')
            .sort({ createdAt: -1 })
            .lean();
        return tickets
            .map((ticket) => {
            const scheduledAt = this.buildTicketDate(ticket);
            return {
                _id: ticket._id,
                ticketNumber: ticket.ticketNumber,
                scheduledAt,
                date: scheduledAt,
                durationMinutes: 30,
                type: 'phone',
                status: 'pending',
                source: 'public-request',
                clientName: ticket.submitterName || 'Client',
                leadName: ticket.submitterName || 'Client',
                leadEmail: ticket.submitterEmail || '',
                leadPhone: ticket.submitterPhone || '',
                phone: ticket.submitterPhone || '',
                projectName: projectTitleById.get(ticket.projectId) || 'Projet',
                notes: ticket.description || '',
            };
        })
            .filter((item) => item.scheduledAt >= from && item.scheduledAt <= to)
            .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    }
    /**
     * Get available slots for a promoteur
     */
    static async getAvailableSlots(promoteurId, date, durationMinutes = 30) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        // Get promoteur's availability settings
        const availability = await Availability_1.default.findOne({ promoteur: promoteurId });
        if (!availability || !availability.isActive) {
            return [];
        }
        const dayOfWeek = date.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];
        const daySchedule = availability.weeklySchedule.find((s) => s.day.toLowerCase() === dayName && s.isAvailable);
        if (!daySchedule) {
            return [];
        }
        // Check for blocked dates
        const isBlocked = availability.blockedDates?.some((blocked) => {
            const blockedStart = new Date(blocked.startDate);
            const blockedEnd = new Date(blocked.endDate);
            return date >= blockedStart && date <= blockedEnd;
        });
        if (isBlocked) {
            return [];
        }
        // Get existing appointments for that day
        const existingAppointments = await Appointment_1.default.find({
            promoteur: promoteurId,
            scheduledAt: { $gte: dayStart, $lte: dayEnd },
            status: { $in: ['requested', 'confirmed'] },
        });
        // Generate available slots
        const slots = [];
        for (const slot of daySchedule.slots) {
            const [startHour, startMin] = slot.startTime.split(':').map(Number);
            const [endHour, endMin] = slot.endTime.split(':').map(Number);
            let current = new Date(date);
            current.setHours(startHour, startMin, 0, 0);
            const slotEnd = new Date(date);
            slotEnd.setHours(endHour, endMin, 0, 0);
            while (current.getTime() + durationMinutes * 60 * 1000 <= slotEnd.getTime()) {
                const appointmentEnd = new Date(current.getTime() + durationMinutes * 60 * 1000);
                // Check if slot conflicts with existing appointments
                const hasConflict = existingAppointments.some(apt => {
                    const aptStart = new Date(apt.scheduledAt);
                    const aptEnd = new Date(aptStart.getTime() + apt.durationMinutes * 60 * 1000);
                    return (current < aptEnd && appointmentEnd > aptStart);
                });
                if (!hasConflict && current > new Date()) {
                    slots.push({ start: new Date(current), end: appointmentEnd });
                }
                current = new Date(current.getTime() + durationMinutes * 60 * 1000);
            }
        }
        return slots;
    }
    /**
     * Create a new appointment
     */
    static async createAppointment(data) {
        const canScheduleAppointments = await PlanLimitService_1.PlanLimitService.checkCapability(data.promoteurId, 'calendarAppointments');
        if (!canScheduleAppointments) {
            throw new Error('Appointment scheduling is not available on this plan');
        }
        const appointment = new Appointment_1.default({
            promoteur: data.promoteurId,
            project: data.projectId,
            lead: data.leadId,
            scheduledAt: data.scheduledAt,
            durationMinutes: data.durationMinutes,
            type: data.type,
            notes: data.notes,
            status: 'requested',
            createdBy: data.createdBy,
        });
        await appointment.save();
        // Update lead with meeting info
        await Lead_1.default.findByIdAndUpdate(data.leadId, {
            meetingScheduled: {
                date: data.scheduledAt,
                type: data.type,
                notes: data.notes,
            },
            status: 'rdv-planifie',
            $push: {
                pipeline: {
                    status: 'rdv-planifie',
                    changedAt: new Date(),
                    changedBy: data.createdBy,
                    notes: `RDV ${data.type} planifié`,
                },
            },
        });
        // Send notifications
        const lead = await Lead_1.default.findById(data.leadId);
        const project = await Project_1.default.findById(data.projectId).populate('promoteur');
        if (lead && project) {
            // Notify promoteur
            await NotificationService_1.NotificationService.create({
                recipient: project.promoteur.user?.toString(),
                type: 'lead',
                title: 'Nouveau RDV planifié',
                message: `Un RDV ${data.type} a été planifié avec ${lead.firstName} ${lead.lastName}`,
                priority: 'high',
                channels: { inApp: true, email: true },
                data: { appointmentId: appointment._id, leadId: data.leadId },
            });
        }
        return appointment;
    }
    /**
     * Confirm an appointment
     */
    static async confirmAppointment(appointmentId, userId) {
        const appointment = await Appointment_1.default.findByIdAndUpdate(appointmentId, { status: 'confirmed' }, { new: true }).populate('lead');
        if (appointment) {
            const lead = appointment.lead;
            if (lead) {
                // Notify client
                await NotificationService_1.NotificationService.create({
                    recipient: lead.client?.toString(),
                    type: 'system',
                    title: 'RDV confirmé',
                    message: `Votre rendez-vous a été confirmé pour le ${appointment.scheduledAt.toLocaleDateString()}`,
                    priority: 'high',
                    channels: { inApp: true, email: true },
                });
            }
        }
        return appointment;
    }
    /**
     * Cancel an appointment
     */
    static async cancelAppointment(appointmentId, userId, reason) {
        const appointment = await Appointment_1.default.findByIdAndUpdate(appointmentId, {
            status: 'canceled',
            notes: reason ? `Annulé: ${reason}` : undefined,
        }, { new: true }).populate('lead');
        if (appointment) {
            // Update lead status
            await Lead_1.default.findByIdAndUpdate(appointment.lead, {
                status: 'contacte',
                $unset: { meetingScheduled: 1 },
                $push: {
                    pipeline: {
                        status: 'rdv-annule',
                        changedAt: new Date(),
                        changedBy: userId,
                        notes: reason || 'RDV annulé',
                    },
                },
            });
        }
        return appointment;
    }
    /**
     * Complete an appointment
     */
    static async completeAppointment(appointmentId, userId, notes) {
        const appointment = await Appointment_1.default.findByIdAndUpdate(appointmentId, {
            status: 'completed',
            notes: notes || undefined,
        }, { new: true });
        if (appointment) {
            // Update lead status
            await Lead_1.default.findByIdAndUpdate(appointment.lead, {
                status: 'visite-effectuee',
                $push: {
                    pipeline: {
                        status: 'visite-effectuee',
                        changedAt: new Date(),
                        changedBy: userId,
                        notes: notes || 'Visite effectuée',
                    },
                },
            });
        }
        return appointment;
    }
    /**
     * Get upcoming appointments for a promoteur
     */
    static async getUpcomingAppointments(promoteurId, days = 7) {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + days);
        const appointments = await Appointment_1.default.find({
            promoteur: promoteurId,
            scheduledAt: { $gte: now, $lte: future },
            status: { $in: ['requested', 'confirmed'] },
        })
            .populate('lead', 'firstName lastName email phone')
            .populate('project', 'title')
            .sort({ scheduledAt: 1 });
        const normalizedAppointments = appointments.map((appointment) => {
            const lead = appointment.lead || {};
            const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
            return {
                ...appointment.toObject(),
                date: appointment.scheduledAt,
                source: 'appointment',
                leadName: leadName || 'Client',
                clientName: leadName || 'Client',
                leadEmail: lead.email || '',
                leadPhone: lead.phone || '',
                phone: lead.phone || '',
                projectName: appointment.project?.title || '',
            };
        });
        const publicRequests = await this.getPublicAppointmentRequests(promoteurId, now, future);
        return [...normalizedAppointments, ...publicRequests].sort((a, b) => {
            const aDate = new Date(a.scheduledAt || a.date).getTime();
            const bDate = new Date(b.scheduledAt || b.date).getTime();
            return aDate - bDate;
        });
    }
    /**
     * Generate calendar link (ICS format)
     */
    static generateCalendarLink(appointment) {
        const start = new Date(appointment.scheduledAt);
        const end = new Date(start.getTime() + appointment.durationMinutes * 60 * 1000);
        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `DTSTART:${formatDate(start)}`,
            `DTEND:${formatDate(end)}`,
            `SUMMARY:RDV - ${appointment.project?.title || 'Projet'}`,
            `DESCRIPTION:${appointment.notes || 'Rendez-vous immobilier'}`,
            'END:VEVENT',
            'END:VCALENDAR',
        ].join('\r\n');
        return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
    }
    /**
     * Send appointment reminders
     */
    static async sendReminders() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
        // Get appointments in the next 24 hours
        const appointments = await Appointment_1.default.find({
            scheduledAt: { $gte: now, $lte: tomorrow },
            status: 'confirmed',
        })
            .populate('lead')
            .populate('project', 'title');
        let remindersSent = 0;
        for (const apt of appointments) {
            const timeUntil = apt.scheduledAt.getTime() - now.getTime();
            const hoursUntil = timeUntil / (60 * 60 * 1000);
            const lead = apt.lead;
            // Send reminder if 24 hours before
            if (hoursUntil <= 24 && hoursUntil > 23) {
                if (lead?.client) {
                    await NotificationService_1.NotificationService.create({
                        recipient: lead.client.toString(),
                        type: 'reminder',
                        title: 'Rappel RDV demain',
                        message: `Votre rendez-vous est prévu demain à ${apt.scheduledAt.toLocaleTimeString()}`,
                        priority: 'high',
                        channels: { inApp: true, email: true },
                    });
                    remindersSent++;
                }
            }
            // Send reminder if 1 hour before
            if (hoursUntil <= 1 && hoursUntil > 0.5) {
                if (lead?.client) {
                    await NotificationService_1.NotificationService.create({
                        recipient: lead.client.toString(),
                        type: 'reminder',
                        title: 'RDV dans 1 heure',
                        message: `Votre rendez-vous commence dans 1 heure`,
                        priority: 'urgent',
                        channels: { inApp: true },
                    });
                    remindersSent++;
                }
            }
        }
        return remindersSent;
    }
}
exports.AppointmentService = AppointmentService;
