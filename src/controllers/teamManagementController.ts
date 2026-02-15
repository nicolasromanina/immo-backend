import { Request, Response } from 'express';
import Promoteur from '../models/Promoteur';
import TeamRole from '../models/TeamRole';
import TeamActivity from '../models/TeamActivity';
import Lead from '../models/Lead';
import User from '../models/User';

export class TeamManagementController {
  /**
   * Get all team members with their roles and permissions
   */
  async getTeamMembers(req: Request, res: Response) {
    try {
      const { user } = req as any;
      const promoteur = await Promoteur.findOne({ user: user._id }).populate('teamMembers.userId');
      
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Get team roles
      const teamRoles = await TeamRole.find({ promoteur: promoteur._id });
      
      // Enrich team members with roles
      const teamWithRoles = await Promise.all(promoteur.teamMembers.map(async (member: any) => {
        const memberUser = await User.findById(member.userId).select('email firstName lastName');
        const roleData = teamRoles.find(r => r.name === member.role);
        
        return {
          userId: member.userId,
          email: memberUser?.email,
          name: `${memberUser?.firstName} ${memberUser?.lastName}`,
          role: member.role,
          permissions: roleData?.permissions || {},
          addedAt: member.addedAt,
        };
      }));

      res.json({ teamMembers: teamWithRoles, roles: teamRoles });
    } catch (error) {
      console.error('Error getting team members:', error);
      res.status(500).json({ message: 'Error fetching team members' });
    }
  }

  /**
   * Create or update a team role with granular permissions
   */
  async createTeamRole(req: Request, res: Response) {
    try {
      const { user } = req as any;
      const { name, description, permissions } = req.body;

      const promoteur = await Promoteur.findOne({ user: user._id });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Check if role already exists
      const existingRole = await TeamRole.findOne({ promoteur: promoteur._id, name });
      if (existingRole) {
        existingRole.description = description;
        existingRole.permissions = { ...existingRole.permissions, ...permissions };
        await existingRole.save();
        return res.json({ message: 'Role updated', role: existingRole });
      }

      const newRole = await TeamRole.create({
        promoteur: promoteur._id,
        name,
        description,
        permissions,
      });

      // Log activity
      await TeamActivity.create({
        promoteur: promoteur._id,
        actor: user._id,
        action: 'created',
        category: 'permission',
        targetType: 'role',
        targetName: name,
        details: { after: permissions },
      });

      res.json({ message: 'Role created', role: newRole });
    } catch (error) {
      console.error('Error creating team role:', error);
      res.status(500).json({ message: 'Error creating role' });
    }
  }

  /**
   * Assign a lead to a team member
   */
  async assignLead(req: Request, res: Response) {
    try {
      const { user } = req as any;
      const { leadId, assignToUserId } = req.body;

      const promoteur = await Promoteur.findOne({ user: user._id });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Check if assignee is part of the team
      const teamMember = promoteur.teamMembers.find(
        (m: any) => m.userId.toString() === assignToUserId
      );
      if (!teamMember) {
        return res.status(403).json({ message: 'User is not a team member' });
      }

      // Check permissions
      const roleData = await TeamRole.findOne({ 
        promoteur: promoteur._id, 
        name: teamMember.role 
      });
      const currentUserRole = promoteur.teamMembers.find(
        (m: any) => m.userId.toString() === user._id.toString()
      );
      const currentRoleData = await TeamRole.findOne({ 
        promoteur: promoteur._id, 
        name: currentUserRole?.role 
      });

      if (!currentRoleData?.permissions.assignLeads) {
        return res.status(403).json({ message: 'You do not have permission to assign leads' });
      }

      const lead = await Lead.findById(leadId);
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      const oldAssignment = lead.assignedTo;
      lead.assignedTo = assignToUserId;
      await lead.save();

      // Log activity
      await TeamActivity.create({
        promoteur: promoteur._id,
        actor: user._id,
        action: 'assigned',
        category: 'assignment',
        targetType: 'lead',
        targetId: leadId,
        targetName: `${lead.firstName} ${lead.lastName}`,
        leadAssignment: {
          leadId,
          assignedTo: assignToUserId,
          assignedBy: user._id,
        },
        details: {
          before: { assignedTo: oldAssignment },
          after: { assignedTo: assignToUserId },
        },
      });

      res.json({ message: 'Lead assigned successfully', lead });
    } catch (error) {
      console.error('Error assigning lead:', error);
      res.status(500).json({ message: 'Error assigning lead' });
    }
  }

  /**
   * Get team activity log
   */
  async getTeamActivityLog(req: Request, res: Response) {
    try {
      const { user } = req as any;
      const { limit = 50, skip = 0, category, action } = req.query;

      const promoteur = await Promoteur.findOne({ user: user._id });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Check permission to view audit logs
      const userRole = promoteur.teamMembers.find(
        (m: any) => m.userId.toString() === user._id.toString()
      );
      const roleData = await TeamRole.findOne({ 
        promoteur: promoteur._id, 
        name: userRole?.role 
      });

      if (!roleData?.permissions.viewAuditLogs && userRole?.role !== 'admin') {
        return res.status(403).json({ message: 'You do not have permission to view audit logs' });
      }

      // Build query
      const query: any = { promoteur: promoteur._id };
      if (category) query.category = category;
      if (action) query.action = action;

      const activities = await TeamActivity.find(query)
        .populate('actor', 'email firstName lastName')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(skip as string));

      const total = await TeamActivity.countDocuments(query);

      res.json({ activities, total, limit, skip });
    } catch (error) {
      console.error('Error fetching activity log:', error);
      res.status(500).json({ message: 'Error fetching activity log' });
    }
  }

  /**
   * Get lead assignments for a team member
   */
  async getTeamMemberAssignments(req: Request, res: Response) {
    try {
      const { user } = req as any;
      const { userId } = req.params;

      const promoteur = await Promoteur.findOne({ user: user._id });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Verify user is team member
      const teamMember = promoteur.teamMembers.find(
        (m: any) => m.userId.toString() === userId
      );
      if (!teamMember) {
        return res.status(403).json({ message: 'User is not a team member' });
      }

      const leads = await Lead.find({ 
        promoteur: promoteur._id,
        assignedTo: userId 
      }).select('firstName lastName email score status budget sourceLeadCreatedAt');

      res.json({ assignments: leads, total: leads.length, userId });
    } catch (error) {
      console.error('Error fetching team member assignments:', error);
      res.status(500).json({ message: 'Error fetching assignments' });
    }
  }

  /**
   * Get member modifications history
   */
  async getMemberModificationHistory(req: Request, res: Response) {
    try {
      const { user } = req as any;
      const { userId } = req.params;
      const { limit = 30, skip = 0 } = req.query;

      const promoteur = await Promoteur.findOne({ user: user._id });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Check if user can view this history
      const userRole = promoteur.teamMembers.find(
        (m: any) => m.userId.toString() === user._id.toString()
      );
      const roleData = await TeamRole.findOne({ 
        promoteur: promoteur._id, 
        name: userRole?.role 
      });

      if (userId !== user._id.toString() && !roleData?.permissions.viewAuditLogs && userRole?.role !== 'admin') {
        return res.status(403).json({ message: 'You do not have permission to view this history' });
      }

      const history = await TeamActivity.find({
        promoteur: promoteur._id,
        actor: userId,
      })
        .populate('actor', 'email firstName lastName')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(skip as string));

      const total = await TeamActivity.countDocuments({
        promoteur: promoteur._id,
        actor: userId,
      });

      // Group by date for better visualization
      const groupedHistory = history.reduce((acc: any, activity: any) => {
        const date = new Date(activity.timestamp).toLocaleDateString('fr-FR');
        if (!acc[date]) acc[date] = [];
        acc[date].push(activity);
        return acc;
      }, {});

      res.json({ history: groupedHistory, total, userId });
    } catch (error) {
      console.error('Error fetching modification history:', error);
      res.status(500).json({ message: 'Error fetching history' });
    }
  }

  /**
   * Update team member role and permissions
   */
  async updateTeamMemberRole(req: Request, res: Response) {
    try {
      const { user } = req as any;
      const { memberId, newRole } = req.body;

      const promoteur = await Promoteur.findOne({ user: user._id });
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Check permission
      const currentUserRole = promoteur.teamMembers.find(
        (m: any) => m.userId.toString() === user._id.toString()
      );
      const currentRoleData = await TeamRole.findOne({ 
        promoteur: promoteur._id, 
        name: currentUserRole?.role 
      });

      if (!currentRoleData?.permissions.changeRoles) {
        return res.status(403).json({ message: 'You do not have permission to change roles' });
      }

      // Update team member role
      const teamMemberIndex = promoteur.teamMembers.findIndex(
        (m: any) => m.userId.toString() === memberId
      );

      if (teamMemberIndex === -1) {
        return res.status(404).json({ message: 'Team member not found' });
      }

      const oldRole = promoteur.teamMembers[teamMemberIndex].role;
      promoteur.teamMembers[teamMemberIndex].role = newRole;
      await promoteur.save();

      // Log activity
      const memberUser = await User.findById(memberId).select('email firstName lastName');
      await TeamActivity.create({
        promoteur: promoteur._id,
        actor: user._id,
        action: 'updated',
        category: 'team',
        targetType: 'team_member',
        targetId: memberId,
        targetName: `${memberUser?.firstName} ${memberUser?.lastName}`,
        details: {
          before: { role: oldRole },
          after: { role: newRole },
        },
      });

      res.json({ message: 'Team member role updated', promoteur });
    } catch (error) {
      console.error('Error updating team member role:', error);
      res.status(500).json({ message: 'Error updating role' });
    }
  }
}

export default new TeamManagementController();
