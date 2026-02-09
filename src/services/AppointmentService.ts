import Appointment from '../models/Appointment';
import Availability from '../models/Availability';
import Lead from '../models/Lead';
import Project from '../models/Project';
import { NotificationService } from './NotificationService';
import mongoose from 'mongoose';

export class AppointmentService {
  /**
   * Get available slots for a promoteur
   */
  static async getAvailableSlots(promoteurId: string, date: Date, durationMinutes: number = 30) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Get promoteur's availability settings
    const availability = await Availability.findOne({ promoteur: promoteurId });
    if (!availability || !availability.isActive) {
      return [];
    }

    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const daySchedule = availability.weeklySchedule.find(
      (s: any) => s.day.toLowerCase() === dayName && s.isAvailable
    );
    
    if (!daySchedule) {
      return [];
    }

    // Check for blocked dates
    const isBlocked = availability.blockedDates?.some(
      (blocked: any) => {
        const blockedStart = new Date(blocked.startDate);
        const blockedEnd = new Date(blocked.endDate);
        return date >= blockedStart && date <= blockedEnd;
      }
    );

    if (isBlocked) {
      return [];
    }

    // Get existing appointments for that day
    const existingAppointments = await Appointment.find({
      promoteur: promoteurId,
      scheduledAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['requested', 'confirmed'] },
    });

    // Generate available slots
    const slots: Array<{ start: Date; end: Date }> = [];
    
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
  static async createAppointment(data: {
    promoteurId: string;
    projectId: string;
    leadId: string;
    scheduledAt: Date;
    durationMinutes: number;
    type: 'visio' | 'physique' | 'phone';
    notes?: string;
    createdBy: string;
  }) {
    const appointment = new Appointment({
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
    await Lead.findByIdAndUpdate(data.leadId, {
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
    const lead = await Lead.findById(data.leadId);
    const project = await Project.findById(data.projectId).populate('promoteur');
    
    if (lead && project) {
      // Notify promoteur
      await NotificationService.create({
        recipient: (project.promoteur as any).user?.toString(),
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
  static async confirmAppointment(appointmentId: string, userId: string) {
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: 'confirmed' },
      { new: true }
    ).populate('lead');

    if (appointment) {
      const lead = appointment.lead as any;
      if (lead) {
        // Notify client
        await NotificationService.create({
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
  static async cancelAppointment(appointmentId: string, userId: string, reason?: string) {
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { 
        status: 'canceled',
        notes: reason ? `Annulé: ${reason}` : undefined,
      },
      { new: true }
    ).populate('lead');

    if (appointment) {
      // Update lead status
      await Lead.findByIdAndUpdate(appointment.lead, {
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
  static async completeAppointment(appointmentId: string, userId: string, notes?: string) {
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { 
        status: 'completed',
        notes: notes || undefined,
      },
      { new: true }
    );

    if (appointment) {
      // Update lead status
      await Lead.findByIdAndUpdate(appointment.lead, {
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
  static async getUpcomingAppointments(promoteurId: string, days: number = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return Appointment.find({
      promoteur: promoteurId,
      scheduledAt: { $gte: now, $lte: future },
      status: { $in: ['requested', 'confirmed'] },
    })
      .populate('lead', 'firstName lastName email phone')
      .populate('project', 'title')
      .sort({ scheduledAt: 1 });
  }

  /**
   * Generate calendar link (ICS format)
   */
  static generateCalendarLink(appointment: any): string {
    const start = new Date(appointment.scheduledAt);
    const end = new Date(start.getTime() + appointment.durationMinutes * 60 * 1000);
    
    const formatDate = (date: Date) => {
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
    const appointments = await Appointment.find({
      scheduledAt: { $gte: now, $lte: tomorrow },
      status: 'confirmed',
    })
      .populate('lead')
      .populate('project', 'title');

    let remindersSent = 0;

    for (const apt of appointments) {
      const timeUntil = apt.scheduledAt.getTime() - now.getTime();
      const hoursUntil = timeUntil / (60 * 60 * 1000);

      const lead = apt.lead as any;
      
      // Send reminder if 24 hours before
      if (hoursUntil <= 24 && hoursUntil > 23) {
        if (lead?.client) {
          await NotificationService.create({
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
          await NotificationService.create({
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
