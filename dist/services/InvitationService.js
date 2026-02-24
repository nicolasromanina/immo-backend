"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationService = void 0;
const nanoid_1 = require("nanoid");
const OrganizationInvitation_1 = __importDefault(require("../models/OrganizationInvitation"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = require("../utils/emailService");
const roles_1 = require("../config/roles");
class InvitationService {
    static async createInvitation(promoteurId, email, role, invitedBy) {
        // Check if user is already a team member
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            throw new Error('Promoteur not found');
        const existingMember = promoteur.teamMembers.find(member => member.userId.toString() === invitedBy);
        if (existingMember) {
            throw new Error('User is already a team member');
        }
        // Check for existing pending invitation
        const existingInvitation = await OrganizationInvitation_1.default.findOne({
            promoteur: promoteurId,
            email,
            status: 'pending'
        });
        if (existingInvitation) {
            throw new Error('Invitation already sent to this email');
        }
        // Generate token
        const token = (0, nanoid_1.nanoid)(32);
        // Create invitation
        const invitation = await OrganizationInvitation_1.default.create({
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
    static async resendInvitation(invitationId, promoteurId, userId) {
        const invitation = await OrganizationInvitation_1.default.findOne({
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
        invitation.token = (0, nanoid_1.nanoid)(32);
        invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await invitation.save();
        await this.sendInvitationEmail(invitation);
        return invitation;
    }
    static async acceptInvitation(token, userId) {
        console.log('[InvitationService.acceptInvitation] Starting - token:', token, 'userId:', userId);
        const invitation = await OrganizationInvitation_1.default.findOne({
            token,
            status: 'pending'
        }).populate('promoteur');
        console.log('[InvitationService.acceptInvitation] Invitation found:', !!invitation, invitation?._id);
        if (!invitation) {
            console.log('[InvitationService.acceptInvitation] ERROR: Invitation not found or not pending');
            throw new Error('Invalid or expired invitation');
        }
        if (invitation.expiresAt < new Date()) {
            console.log('[InvitationService.acceptInvitation] ERROR: Invitation expired');
            invitation.status = 'expired';
            await invitation.save();
            throw new Error('Invitation has expired');
        }
        // Récupérer l'utilisateur
        const user = await User_1.default.findById(userId);
        console.log('[InvitationService.acceptInvitation] User found:', !!user, user?.email);
        if (!user) {
            console.log('[InvitationService.acceptInvitation] ERROR: User not found');
            throw new Error('User not found');
        }
        console.log('[InvitationService.acceptInvitation] Email check - invitation.email:', invitation.email, 'user.email:', user.email, 'match:', invitation.email === user.email);
        if (invitation.email !== user.email) {
            console.log('[InvitationService.acceptInvitation] ERROR: Email does not match');
            throw new Error('Email does not match invitation');
        }
        // Ne pas attribuer automatiquement le rôle global PROMOTEUR aux invités.
        // L'accès promoteur est désormais géré par promoteurProfile + RBAC d'équipe.
        console.log('[InvitationService.acceptInvitation] User roles before (unchanged):', user.roles);
        // Add user to team et lier promoteurProfile
        let promoteur = await Promoteur_1.default.findById(invitation.promoteur);
        console.log('[InvitationService.acceptInvitation] Promoteur found:', !!promoteur, promoteur?._id);
        if (!promoteur) {
            console.log('[InvitationService.acceptInvitation] ERROR: Promoteur not found');
            throw new Error('Promoteur not found');
        }
        if (!user.promoteurProfile) {
            user.promoteurProfile = promoteur._id;
            console.log('[InvitationService.acceptInvitation] Set promoteurProfile:', promoteur._id);
        }
        // Sauvegarder les changements de l'utilisateur (rôle et promoteurProfile)
        console.log('[InvitationService.acceptInvitation] Saving user...');
        await user.save();
        console.log('[InvitationService.acceptInvitation] User saved successfully');
        // Déterminer le plan à appliquer selon le rôle de l'invitant (owner)
        // Si l'invitant (owner) est admin, plan premium, sinon standard
        let planToSet = promoteur.plan;
        try {
            const ownerUser = await User_1.default.findById(promoteur.user);
            if (ownerUser && ownerUser.roles.includes(roles_1.Role.ADMIN)) {
                planToSet = 'premium';
                console.log('[InvitationService.acceptInvitation] Plan set to premium (owner is admin)');
            }
            else {
                planToSet = 'standard';
                console.log('[InvitationService.acceptInvitation] Plan set to standard');
            }
        }
        catch (e) {
            console.log('[InvitationService.acceptInvitation] Error determining plan:', e);
        }
        // Check if already a member
        const isAlreadyMember = promoteur.teamMembers.some(member => member.userId.toString() === userId);
        console.log('[InvitationService.acceptInvitation] Is already member:', isAlreadyMember);
        console.log('[InvitationService.acceptInvitation] Team members count:', promoteur.teamMembers.length);
        if (isAlreadyMember) {
            console.log('[InvitationService.acceptInvitation] ERROR: User is already a team member');
            throw new Error('User is already a team member');
        }
        console.log('[InvitationService.acceptInvitation] Adding user to team with role:', invitation.role);
        promoteur.teamMembers.push({
            userId: userId,
            role: invitation.role,
            addedAt: new Date()
        });
        // Mettre à jour le plan si besoin
        if (promoteur.plan !== planToSet) {
            promoteur.plan = planToSet;
            console.log('[InvitationService.acceptInvitation] Updated plan to:', planToSet);
        }
        console.log('[InvitationService.acceptInvitation] Saving promoteur...');
        await promoteur.save();
        console.log('[InvitationService.acceptInvitation] Promoteur saved successfully');
        // Update invitation
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        invitation.acceptedBy = userId;
        console.log('[InvitationService.acceptInvitation] Updating invitation to accepted...');
        await invitation.save();
        console.log('[InvitationService.acceptInvitation] Invitation saved successfully');
        // Récupérer le user mis à jour pour garantir la cohérence
        const updatedUser = await User_1.default.findById(userId);
        console.log('[InvitationService.acceptInvitation] SUCCESS - Updated user roles:', updatedUser?.roles);
        return { promoteur, invitation, user: updatedUser };
    }
    static async cancelInvitation(invitationId, promoteurId) {
        const invitation = await OrganizationInvitation_1.default.findOne({
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
    static async removeTeamMember(promoteurId, memberUserId, requesterId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            throw new Error('Promoteur not found');
        // Check if requester is owner
        if (promoteur.user.toString() !== requesterId) {
            throw new Error('Only the owner can remove team members');
        }
        // Cannot remove owner
        if (promoteur.user.toString() === memberUserId) {
            throw new Error('Cannot remove the owner from the team');
        }
        promoteur.teamMembers = promoteur.teamMembers.filter(member => member.userId.toString() !== memberUserId);
        await promoteur.save();
        return promoteur;
    }
    static async updateTeamMemberRole(promoteurId, memberUserId, newRole, requesterId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            throw new Error('Promoteur not found');
        // Check if requester is owner
        if (promoteur.user.toString() !== requesterId) {
            throw new Error('Only the owner can change team member roles');
        }
        const member = promoteur.teamMembers.find(member => member.userId.toString() === memberUserId);
        if (!member) {
            throw new Error('Team member not found');
        }
        member.role = newRole;
        await promoteur.save();
        return member;
    }
    static async transferOwnership(promoteurId, newOwnerId, currentOwnerId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            throw new Error('Promoteur not found');
        // Check if current user is owner
        if (promoteur.user.toString() !== currentOwnerId) {
            throw new Error('Only the current owner can transfer ownership');
        }
        // Check if new owner is a team member
        const isTeamMember = promoteur.teamMembers.some(member => member.userId.toString() === newOwnerId);
        if (!isTeamMember) {
            throw new Error('New owner must be a current team member');
        }
        // Transfer ownership
        const oldOwner = promoteur.user;
        promoteur.user = newOwnerId;
        // Remove new owner from team members
        promoteur.teamMembers = promoteur.teamMembers.filter(member => member.userId.toString() !== newOwnerId);
        // Add old owner as admin
        promoteur.teamMembers.push({
            userId: oldOwner,
            role: 'admin',
            addedAt: new Date()
        });
        await promoteur.save();
        return promoteur;
    }
    static async getInvitations(promoteurId, status) {
        const query = { promoteur: promoteurId };
        // Par défaut, afficher uniquement les invitations en attente
        query.status = status || 'pending';
        return OrganizationInvitation_1.default.find(query)
            .populate('invitedBy', 'firstName lastName email')
            .sort({ createdAt: -1 });
    }
    static async sendInvitationEmail(invitation) {
        const promoteur = await Promoteur_1.default.findById(invitation.promoteur).populate('user', 'firstName lastName organizationName');
        const inviter = await User_1.default.findById(invitation.invitedBy);
        if (!promoteur || !inviter)
            return;
        // Entry URL used in invitation emails.
        // It can point to a client app (bridge) that forwards to promoteur with current auth token.
        const invitationFrontendUrl = process.env.INVITATION_FRONTEND_URL ||
            process.env.CLIENT_DASHBOARD_URL ||
            process.env.CLIENT_FRONTEND_URL ||
            process.env.PROMOTEUR_FRONTEND_URL ||
            process.env.FRONTEND_PROMOTEUR_URL ||
            'http://localhost:8083';
        const acceptUrl = `${invitationFrontendUrl}/accept-invitation/${invitation.token}`;
        await (0, emailService_1.sendEmail)({
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
exports.InvitationService = InvitationService;
