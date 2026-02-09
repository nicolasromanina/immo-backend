import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { SecurityIncidentService } from '../services/SecurityIncidentService';

export class SecurityIncidentController {
  /**
   * Create security incident
   */
  static async createIncident(req: AuthRequest, res: Response) {
    try {
      const incident = await SecurityIncidentService.createIncident({
        ...req.body,
        createdBy: req.user!.id,
      });

      res.status(201).json({ incident });
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get all incidents
   */
  static async getIncidents(req: AuthRequest, res: Response) {
    try {
      const { status, severity, type, page, limit } = req.query;

      const result = await SecurityIncidentService.getIncidents({
        status: status as string,
        severity: severity as string,
        type: type as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json(result);
    } catch (error) {
      console.error('Error getting incidents:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get incident by ID
   */
  static async getIncident(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const incident = await SecurityIncidentService.getIncidentById(id);

      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }

      res.json({ incident });
    } catch (error) {
      console.error('Error getting incident:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update incident status
   */
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!['investigating', 'contained', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const incident = await SecurityIncidentService.updateStatus(
        id,
        status,
        req.user!.id,
        notes
      );

      res.json({ incident });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Add note to incident
   */
  static async addNote(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { note } = req.body;

      if (!note) {
        return res.status(400).json({ message: 'Note is required' });
      }

      const incident = await SecurityIncidentService.addNote(
        id,
        note,
        req.user!.id
      );

      res.json({ incident });
    } catch (error) {
      console.error('Error adding note:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Add response action
   */
  static async addResponseAction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { action, notes } = req.body;

      if (!action) {
        return res.status(400).json({ message: 'Action is required' });
      }

      const incident = await SecurityIncidentService.addResponseAction(
        id,
        action,
        req.user!.id,
        notes
      );

      res.json({ incident });
    } catch (error) {
      console.error('Error adding response action:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Assign investigator
   */
  static async assignInvestigator(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { investigatorId, isLead } = req.body;

      if (!investigatorId) {
        return res.status(400).json({ message: 'Investigator ID is required' });
      }

      const incident = await SecurityIncidentService.assignInvestigator(
        id,
        investigatorId,
        isLead
      );

      res.json({ incident });
    } catch (error) {
      console.error('Error assigning investigator:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Notify affected users
   */
  static async notifyUsers(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { content, recipientType } = req.body;

      if (!content || !recipientType) {
        return res.status(400).json({ message: 'Content and recipient type are required' });
      }

      const count = await SecurityIncidentService.notifyAffectedUsers(
        id,
        content,
        recipientType
      );

      res.json({ notificationsSent: count });
    } catch (error: any) {
      console.error('Error notifying users:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }

  /**
   * Set root cause
   */
  static async setRootCause(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { rootCause } = req.body;

      if (!rootCause) {
        return res.status(400).json({ message: 'Root cause is required' });
      }

      const incident = await SecurityIncidentService.setRootCause(
        id,
        rootCause,
        req.user!.id
      );

      res.json({ incident });
    } catch (error) {
      console.error('Error setting root cause:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Submit regulatory report
   */
  static async submitRegulatoryReport(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reportRef } = req.body;

      if (!reportRef) {
        return res.status(400).json({ message: 'Report reference is required' });
      }

      const incident = await SecurityIncidentService.submitRegulatoryReport(
        id,
        reportRef,
        req.user!.id
      );

      res.json({ incident });
    } catch (error) {
      console.error('Error submitting regulatory report:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get active incidents count
   */
  static async getActiveCount(req: AuthRequest, res: Response) {
    try {
      const count = await SecurityIncidentService.getActiveIncidentsCount();

      res.json({ count });
    } catch (error) {
      console.error('Error getting active count:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get critical incidents
   */
  static async getCriticalIncidents(req: AuthRequest, res: Response) {
    try {
      const incidents = await SecurityIncidentService.getCriticalIncidents();

      res.json({ incidents });
    } catch (error) {
      console.error('Error getting critical incidents:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
