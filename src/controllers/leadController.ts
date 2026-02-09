import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Lead from '../models/Lead';
import Project from '../models/Project';
import Promoteur from '../models/Promoteur';
import User from '../models/User';
import Appointment from '../models/Appointment';
import Availability from '../models/Availability';
import { LeadScoringService } from '../services/LeadScoringService';
import { NotificationService } from '../services/NotificationService';
import { AuditLogService } from '../services/AuditLogService';
import { CRMWebhookService } from '../services/CRMWebhookService';

export class LeadController {
  /**
   * Create a lead (from client side)
   */
  static async createLead(req: AuthRequest, res: Response) {
    try {
      const {
        projectId,
        firstName,
        lastName,
        email,
        phone,
        whatsapp,
        budget,
        financingType,
        timeframe,
        interestedTypology,
        initialMessage,
        contactMethod,
      } = req.body;

      const project = await Project.findById(projectId);
      if (!project || project.publicationStatus !== 'published') {
        return res.status(404).json({ message: 'Project not found or not available' });
      }

      const lead = await LeadScoringService.createLead({
        projectId,
        promoteurId: project.promoteur.toString(),
        clientId: req.user?.id,
        firstName,
        lastName,
        email,
        phone,
        whatsapp,
        budget,
        financingType,
        timeframe,
        interestedTypology,
        initialMessage,
        contactMethod,
        source: 'website',
      });

      // Update promoteur stats
      await Promoteur.findByIdAndUpdate(project.promoteur, {
        $inc: { totalLeadsReceived: 1 },
      });

      // Get promoteur user for notification
      const promoteur = await Promoteur.findById(project.promoteur).populate('user');
      if (promoteur?.user) {
        await NotificationService.notifyNewLead({
          promoteurUserId: (promoteur.user as any)._id.toString(),
          leadId: lead._id.toString(),
          projectTitle: project.title,
          leadName: `${firstName} ${lastName}`,
          leadScore: lead.score,
        });
      }

      res.status(201).json({ lead });
      await CRMWebhookService.pushEvent({
        promoteurId: project.promoteur.toString(),
        event: 'lead.created',
        payload: { leadId: lead._id.toString(), projectId: project._id.toString() },
      });
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get leads for promoteur
   */
  static async getLeads(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(403).json({ message: 'Only promoteurs can access leads' });
      }

      const {
        projectId,
        status,
        score,
        page = 1,
        limit = 20,
      } = req.query;

      const query: any = { promoteur: user.promoteurProfile };

      if (projectId) query.project = projectId;
      if (status) query.status = status;
      if (score) query.score = score;

      const skip = (Number(page) - 1) * Number(limit);

      const leads = await Lead.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .populate('project', 'title slug')
        .populate('client', 'firstName lastName email');

      const total = await Lead.countDocuments(query);

      // Stats by score
      const scoreStats = await Lead.aggregate([
        { $match: { promoteur: user.promoteurProfile } },
        { $group: { _id: '$score', count: { $sum: 1 } } },
      ]);

      // Stats by status
      const statusStats = await Lead.aggregate([
        { $match: { promoteur: user.promoteurProfile } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      res.json({
        leads,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
        stats: {
          byScore: scoreStats,
          byStatus: statusStats,
        },
      });
    } catch (error) {
      console.error('Error getting leads:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get single lead
   */
  static async getLead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user!.id);

      const lead = await Lead.findById(id)
        .populate('project', 'title slug media')
        .populate('client', 'firstName lastName email phone')
        .populate('notes.addedBy', 'firstName lastName');

      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      // Check ownership
      if (lead.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this lead' });
      }

      res.json({ lead });
    } catch (error) {
      console.error('Error getting lead:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update lead status
   */
  static async updateLeadStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const user = await User.findById(req.user!.id);

      const lead = await Lead.findById(id);
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      // Check ownership
      if (lead.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Record first contact if status changes from 'nouveau'
      if (lead.status === 'nouveau' && status !== 'nouveau') {
        await LeadScoringService.recordResponse(id);
        
        // Update promoteur average response time
        const allLeads = await Lead.find({ 
          promoteur: user.promoteurProfile,
          responseTime: { $exists: true }
        });
        
        if (allLeads.length > 0) {
          const avgResponseTime = allLeads.reduce((sum, l) => sum + (l.responseTime || 0), 0) / allLeads.length;
          await Promoteur.findByIdAndUpdate(user.promoteurProfile, {
            averageResponseTime: avgResponseTime,
          });
        }
      }

      await LeadScoringService.updateLeadStatus(id, status, user._id.toString(), notes);

      const updatedLead = await Lead.findById(id);

      await AuditLogService.logFromRequest(
        req,
        'update_lead_status',
        'lead',
        `Updated lead status to ${status}`,
        'Lead',
        id,
        { oldStatus: lead.status, newStatus: status }
      );

      await CRMWebhookService.pushEvent({
        promoteurId: lead.promoteur.toString(),
        event: 'lead.status_changed',
        payload: { leadId: id, status },
      });

      res.json({ lead: updatedLead });
    } catch (error) {
      console.error('Error updating lead status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get promoteur availability
   */
  static async getPromoteurAvailability(req: AuthRequest, res: Response) {
    try {
      const { promoteurId } = req.params;
      const availability = await Availability.findOne({ promoteur: promoteurId });
      res.json({ availability });
    } catch (error) {
      console.error('Error getting promoteur availability:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Schedule an appointment for a lead
   */
  static async scheduleAppointment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { scheduledAt, durationMinutes = 30, type, notes } = req.body;
      const user = await User.findById(req.user!.id);

      const lead = await Lead.findById(id).populate('project');
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      const isOwner = lead.promoteur.toString() === user?.promoteurProfile?.toString();
      const isClient = lead.client && lead.client.toString() === req.user!.id;

      if (!isOwner && !isClient) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      if (!scheduledAt || !type) {
        return res.status(400).json({ message: 'scheduledAt and type are required' });
      }

      const date = new Date(scheduledAt);
      if (Number.isNaN(date.getTime()) || date <= new Date()) {
        return res.status(400).json({ message: 'scheduledAt must be a future date' });
      }

      const availability = await Availability.findOne({ promoteur: lead.promoteur });
      if (availability) {
        const day = date.getUTCDay();
        const daySlots = availability.weeklySlots.find(s => s.dayOfWeek === day);
        const time = date.toISOString().slice(11, 16);
        const isBlackout = availability.blackoutDates.some(d => d.toISOString().slice(0, 10) === date.toISOString().slice(0, 10));

        if (isBlackout || !daySlots || !daySlots.slots.some(slot => time >= slot.start && time < slot.end)) {
          return res.status(400).json({ message: 'Selected time is outside availability' });
        }
      }

      const conflict = await Appointment.findOne({
        promoteur: lead.promoteur,
        scheduledAt: {
          $lt: new Date(date.getTime() + durationMinutes * 60000),
          $gte: new Date(date.getTime() - durationMinutes * 60000),
        },
        status: { $in: ['requested', 'confirmed'] },
      });

      if (conflict) {
        return res.status(400).json({ message: 'Time slot already booked' });
      }

      const appointment = await Appointment.create({
        promoteur: lead.promoteur,
        project: lead.project as any,
        lead: lead._id,
        scheduledAt: date,
        durationMinutes,
        type,
        notes,
        createdBy: user!._id,
        status: isOwner ? 'confirmed' : 'requested',
      });

      lead.meetingScheduled = {
        date,
        type,
        notes,
        calendarLink: `internal://appointment/${appointment._id}`,
      };
      await lead.save();
      await LeadScoringService.updateLeadStatus(lead._id.toString(), 'rdv-planifie', user!._id.toString(), notes);

      await AuditLogService.logFromRequest(
        req,
        'schedule_appointment',
        'lead',
        'Scheduled an appointment',
        'Lead',
        lead._id.toString(),
        { scheduledAt: date, type }
      );

      await CRMWebhookService.pushEvent({
        promoteurId: lead.promoteur.toString(),
        event: 'lead.appointment_scheduled',
        payload: { leadId: lead._id.toString(), appointmentId: appointment._id.toString() },
      });

      res.status(201).json({ appointment });
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get appointments for promoteur
   */
  static async getAppointments(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(403).json({ message: 'Only promoteurs can access appointments' });
      }

      const { from, to } = req.query;
      const query: any = { promoteur: user.promoteurProfile };
      if (from || to) {
        query.scheduledAt = {};
        if (from) query.scheduledAt.$gte = new Date(from as string);
        if (to) query.scheduledAt.$lte = new Date(to as string);
      }

      const appointments = await Appointment.find(query)
        .sort({ scheduledAt: 1 })
        .populate('lead', 'firstName lastName email phone')
        .populate('project', 'title slug');

      res.json({ appointments });
    } catch (error) {
      console.error('Error getting appointments:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Add note to lead
   */
  static async addNote(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { content, isPrivate } = req.body;
      const user = await User.findById(req.user!.id);

      const lead = await Lead.findById(id);
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      // Check ownership
      if (lead.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      lead.notes.push({
        content,
        addedBy: user._id as any,
        addedAt: new Date(),
        isPrivate: isPrivate || false,
      });

      await lead.save();

      res.json({ lead });
    } catch (error) {
      console.error('Error adding note:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Flag lead as not serious
   */
  static async flagAsNotSerious(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = await User.findById(req.user!.id);

      const lead = await Lead.findById(id);
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      // Check ownership
      if (lead.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      lead.flaggedAsNotSerious = true;
      lead.flagReason = reason;
      lead.isSerious = false;

      await lead.save();

      await AuditLogService.logFromRequest(
        req,
        'flag_lead_not_serious',
        'lead',
        `Flagged lead as not serious: ${reason}`,
        'Lead',
        id
      );

      res.json({ lead });
    } catch (error) {
      console.error('Error flagging lead:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Export leads to CSV
   */
  static async exportLeads(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(403).json({ message: 'Only promoteurs can export leads' });
      }

      const { projectId, status, score } = req.query;

      const query: any = { promoteur: user.promoteurProfile };
      if (projectId) query.project = projectId;
      if (status) query.status = status;
      if (score) query.score = score;

      const leads = await Lead.find(query)
        .populate('project', 'title')
        .sort({ createdAt: -1 });

      // Generate CSV data
      const csvHeader = 'Date,Project,Name,Email,Phone,Score,Budget,Status,Financing\n';
      const csvRows = leads.map(lead => {
        const project = (lead.project as any)?.title || '';
        return `${lead.createdAt.toISOString()},${project},${lead.firstName} ${lead.lastName},${lead.email},${lead.phone},${lead.score},${lead.budget},${lead.status},${lead.financingType}`;
      }).join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      res.send(csv);
    } catch (error) {
      console.error('Error exporting leads:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Assign lead to team member
   */
  static async assignLead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { teamMemberId } = req.body;
      const user = await User.findById(req.user!.id);

      const lead = await Lead.findById(id);
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      // Check ownership
      if (lead.promoteur.toString() !== user?.promoteurProfile?.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      lead.assignedTo = teamMemberId;
      await lead.save();

      res.json({ lead });
    } catch (error) {
      console.error('Error assigning lead:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
