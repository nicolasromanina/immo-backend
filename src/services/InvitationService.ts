import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import OrganizationInvitation from '../models/OrganizationInvitation';
import Promoteur from '../models/Promoteur';
import User from '../models/User';
import { sendEmail } from '../utils/emailService';
import { Role } from '../config/roles';

export class InvitationService {
  static async createInvitation(
    promoteurId: string,
    email: string,
    role: 'commercial' | 'technique' | 'admin',
    invitedBy: string
  ) {
    // Check if user is already a team member
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) throw new Error('Promoteur not found');

    const existingMember = promoteur.teamMembers.find(member =>
      member.userId.toString() === invitedBy
    );

    if (existingMember) {
      throw new Error('User is already a team member');
    }

    // Check for existing pending invitation
    const existingInvitation = await OrganizationInvitation.findOne({
      promoteur: promoteurId,
      email,
      status: 'pending'
    });

    if (existingInvitation) {
      throw new Error('Invitation already sent to this email');
    }

    // Generate token
    const token = nanoid(32);

    // Create invitation
    const invitation = await OrganizationInvitation.create({
      promoteur: promoteurId,
      email,
      role,
      token,
      invitedBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    // Send email
    await this.sendInvitationEmail(invitation);

    return invitation;
  }

  static async resendInvitation(invitationId: string, promoteurId: string, userId: string) {
    const invitation = await OrganizationInvitation.findOne({ 
      _id: invitationId, 
      promoteur: promoteurId 
    });
    
    if (!invitation) {
      throw new Error('Invitation not found');
    }
    
    if (invitation.status !== 'pending') {
      throw new Error('Seules les invitations en attente peuvent être renvoyées');
    }
    
    // Générer un nouveau token et date d'expiration
    invitation.token = nanoid(32);
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await invitation.save();
    
    await this.sendInvitationEmail(invitation);
    
    return invitation;
  }

  static async acceptInvitation(token: string, userId: string) {
    const invitation = await OrganizationInvitation.findOne({
      token,
      status: 'pending'
    }).populate('promoteur');

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      throw new Error('Invitation has expired');
    }

    // Récupérer l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (invitation.email !== user.email) {
      throw new Error('Email does not match invitation');
    }

    // S'assurer que l'utilisateur a le rôle promoteur
    if (!user.roles.includes(Role.PROMOTEUR)) {
      user.roles.push(Role.PROMOTEUR);
    }

    // Add user to team et lier promoteurProfile
    let promoteur = await Promoteur.findById(invitation.promoteur);
    if (!promoteur) throw new Error('Promoteur not found');
    
    if (!user.promoteurProfile) {
      user.promoteurProfile = promoteur._id;
    }

    // Sauvegarder les changements de l'utilisateur (rôle et promoteurProfile)
    await user.save();

    // Déterminer le plan à appliquer selon le rôle de l'invitant (owner)
    // Si l'invitant (owner) est admin, plan premium, sinon standard
    let planToSet = promoteur.plan;
    try {
      const ownerUser = await User.findById(promoteur.user);
      if (ownerUser && ownerUser.roles.includes(Role.ADMIN)) {
        planToSet = 'premium';
      } else {
        planToSet = 'standard';
      }
    } catch (e) {
      // fallback: ne rien changer
    }

    // Check if already a member
    const isAlreadyMember = promoteur.teamMembers.some(member =>
      member.userId.toString() === userId
    );

    if (isAlreadyMember) {
      throw new Error('User is already a team member');
    }

    promoteur.teamMembers.push({
      userId: userId as any,
      role: invitation.role,
      addedAt: new Date()
    });

    // Mettre à jour le plan si besoin
    if (promoteur.plan !== planToSet) {
      promoteur.plan = planToSet;
    }

    await promoteur.save();

    // Update invitation
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = userId as any;
    await invitation.save();

    // Récupérer le user mis à jour pour garantir la cohérence
    const updatedUser = await User.findById(userId);
    return { promoteur, invitation, user: updatedUser };
  }

  static async cancelInvitation(invitationId: string, promoteurId: string) {
    const invitation = await OrganizationInvitation.findOne({
      _id: invitationId,
      promoteur: promoteurId
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    invitation.status = 'expired';
    await invitation.save();

    return invitation;
  }

  static async removeTeamMember(promoteurId: string, memberUserId: string, requesterId: string) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) throw new Error('Promoteur not found');

    // Check if requester is owner
    if (promoteur.user.toString() !== requesterId) {
      throw new Error('Only the owner can remove team members');
    }

    // Cannot remove owner
    if (promoteur.user.toString() === memberUserId) {
      throw new Error('Cannot remove the owner from the team');
    }

    promoteur.teamMembers = promoteur.teamMembers.filter(member =>
      member.userId.toString() !== memberUserId
    );

    await promoteur.save();
    return promoteur;
  }

  static async updateTeamMemberRole(promoteurId: string, memberUserId: string, newRole: 'commercial' | 'technique' | 'admin', requesterId: string) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) throw new Error('Promoteur not found');

    // Check if requester is owner
    if (promoteur.user.toString() !== requesterId) {
      throw new Error('Only the owner can change team member roles');
    }

    const member = promoteur.teamMembers.find(member =>
      member.userId.toString() === memberUserId
    );

    if (!member) {
      throw new Error('Team member not found');
    }

    member.role = newRole;
    await promoteur.save();
    return member;
  }

  static async transferOwnership(promoteurId: string, newOwnerId: string, currentOwnerId: string) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) throw new Error('Promoteur not found');

    // Check if current user is owner
    if (promoteur.user.toString() !== currentOwnerId) {
      throw new Error('Only the current owner can transfer ownership');
    }

    // Check if new owner is a team member
    const isTeamMember = promoteur.teamMembers.some(member =>
      member.userId.toString() === newOwnerId
    );

    if (!isTeamMember) {
      throw new Error('New owner must be a current team member');
    }

    // Transfer ownership
    const oldOwner = promoteur.user;
    promoteur.user = newOwnerId as any;

    // Remove new owner from team members
    promoteur.teamMembers = promoteur.teamMembers.filter(member =>
      member.userId.toString() !== newOwnerId
    );

    // Add old owner as admin
    promoteur.teamMembers.push({
      userId: oldOwner,
      role: 'admin',
      addedAt: new Date()
    });

    await promoteur.save();
    return promoteur;
  }

  static async getInvitations(promoteurId: string, status?: string) {
    const query: any = { promoteur: promoteurId };
    if (status) query.status = status;

    return OrganizationInvitation.find(query)
      .populate('invitedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  private static async sendInvitationEmail(invitation: any) {
    const promoteur = await Promoteur.findById(invitation.promoteur).populate('user', 'firstName lastName organizationName');
    const inviter = await User.findById(invitation.invitedBy);

    if (!promoteur || !inviter) return;

    const acceptUrl = `${process.env.FRONTEND_URL}/accept-invitation/${invitation.token}`;

    await sendEmail({
      to: invitation.email,
      subject: `Invitation à rejoindre l'équipe ${promoteur.organizationName}`,
      template: 'team-invitation',
      data: {
        promoteurName: promoteur.organizationName,
        inviterName: `${inviter.firstName} ${inviter.lastName}`,
        role: invitation.role,
        acceptUrl,
        expiresAt: invitation.expiresAt
      }
    });
  }
}