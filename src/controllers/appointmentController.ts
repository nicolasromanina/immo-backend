import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { AppointmentService } from '../services/AppointmentService';
import Appointment from '../models/Appointment';
import Promoteur from '../models/Promoteur';

export class AppointmentController {
  /**
   * Get available slots for a promoteur
   */
  static async getAvailableSlots(req: AuthRequest, res: Response) {
    try {
      const { promoteurId } = req.params;
      const { date, duration } = req.query;

      if (!date) {
        return res.status(400).json({ message: 'Date is required' });
      }

      const slots = await AppointmentService.getAvailableSlots(
        promoteurId,
        new Date(date as string),
        duration ? parseInt(duration as string) : 30
      );

      res.json({ slots });
    } catch (error) {
      console.error('Error getting available slots:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Create appointment
   */
  static async createAppointment(req: AuthRequest, res: Response) {
    try {
      const {
        promoteurId,
        projectId,
        leadId,
        scheduledAt,
        durationMinutes,
        type,
        notes,
      } = req.body;

      let targetPromoteurId = promoteurId as string | undefined;
      if (!targetPromoteurId) {
        const promoteur = await Promoteur.findOne({ user: req.user!.id }).select('_id');
        targetPromoteurId = promoteur?._id?.toString();
      }

      if (!targetPromoteurId) {
        return res.status(400).json({ message: 'promoteurId is required' });
      }

      const { PlanLimitService } = await import('../services/PlanLimitService');
      const canScheduleAppointments = await PlanLimitService.checkCapability(targetPromoteurId, 'calendarAppointments');
      if (!canScheduleAppointments) {
        return res.status(403).json({
          message: 'La prise de rendez-vous n est pas disponible sur votre plan',
          upgrade: true,
        });
      }

      const appointment = await AppointmentService.createAppointment({
        promoteurId: targetPromoteurId,
        projectId,
        leadId,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes || 30,
        type,
        notes,
        createdBy: req.user!.id,
      });

      res.status(201).json({ appointment });
    } catch (error) {
      console.error('Error creating appointment:', error);
      if ((error as any)?.message?.includes('not available on this plan')) {
        return res.status(403).json({
          message: 'La prise de rendez-vous n est pas disponible sur votre plan',
          upgrade: true,
        });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Confirm appointment
   */
  static async confirmAppointment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const appointment = await AppointmentService.confirmAppointment(
        id,
        req.user!.id
      );

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      res.json({ appointment });
    } catch (error) {
      console.error('Error confirming appointment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Cancel appointment
   */
  static async cancelAppointment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const appointment = await AppointmentService.cancelAppointment(
        id,
        req.user!.id,
        reason
      );

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      res.json({ appointment });
    } catch (error) {
      console.error('Error canceling appointment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Complete appointment
   */
  static async completeAppointment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const appointment = await AppointmentService.completeAppointment(
        id,
        req.user!.id,
        notes
      );

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      res.json({ appointment });
    } catch (error) {
      console.error('Error completing appointment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get upcoming appointments
   */
  static async getUpcomingAppointments(req: AuthRequest, res: Response) {
    try {
      const promoteur = await Promoteur.findOne({ user: req.user!.id });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const { days } = req.query;

      const appointments = await AppointmentService.getUpcomingAppointments(
        promoteur._id.toString(),
        days ? parseInt(days as string) : 7
      );

      res.json({ appointments });
    } catch (error) {
      console.error('Error getting upcoming appointments:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get appointment by ID
   */
  static async getAppointment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const appointment = await Appointment.findById(id)
        .populate('lead', 'firstName lastName email phone')
        .populate('project', 'title');

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      res.json({ appointment });
    } catch (error) {
      console.error('Error getting appointment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get calendar link
   */
  static async getCalendarLink(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const appointment = await Appointment.findById(id).populate('project', 'title');

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      const calendarLink = AppointmentService.generateCalendarLink(appointment);

      res.json({ calendarLink });
    } catch (error) {
      console.error('Error generating calendar link:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get appointments for a project
   */
  static async getProjectAppointments(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const { status } = req.query;

      const query: any = { project: projectId };
      if (status) query.status = status;

      const appointments = await Appointment.find(query)
        .populate('lead', 'firstName lastName email phone')
        .sort({ scheduledAt: 1 });

      res.json({ appointments });
    } catch (error) {
      console.error('Error getting project appointments:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
