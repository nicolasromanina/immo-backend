import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Promoteur from '../models/Promoteur';
import User from '../models/User';
import { AuditLogService } from '../services/AuditLogService';
import { TrustScoreService } from '../services/TrustScoreService';
import { BadgeService } from '../services/BadgeService';
import { OnboardingService } from '../services/OnboardingService';
import { NotificationService } from '../services/NotificationService';
import { Role } from '../config/roles';
import Availability from '../models/Availability';
import { InvitationService } from '../services/InvitationService';

export class PromoteurController {
  /**
   * Supprime un document KYC du promoteur
   */
  static async deleteKYCDocument(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }
      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }
      const docId = req.params.id;
      const beforeCount = promoteur.kycDocuments.length;
      promoteur.kycDocuments = promoteur.kycDocuments.filter((doc: any) => (doc._id?.toString() || doc.id?.toString()) !== docId);
      if (promoteur.kycDocuments.length === beforeCount) {
        return res.status(404).json({ message: 'Document KYC non trouvé' });
      }
      await promoteur.save();
      await AuditLogService.logFromRequest(
        req,
        'delete_kyc_document',
        'promoteur',
        `Suppression d'un document KYC`,
        'Promoteur',
        promoteur._id.toString()
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Erreur suppression document KYC:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  /**
   * Upload file to Cloudinary (KYC, avatar, etc.)
   */
  static async uploadFile(req: AuthRequest, res: Response) {
    try {
      // Utilise multer pour parser le fichier
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'Aucun fichier fourni' });
      }
      // Cloudinary
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      // Upload
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'promoteur',
      });
      res.json({ url: result.secure_url });
    } catch (error) {
      console.error('Error uploading file to Cloudinary:', error);
      res.status(500).json({ message: 'Erreur upload Cloudinary' });
    }
  }

  /**
   * Get promoteur profile
   */
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id).populate('promoteurProfile');
      console.log('[PromoteurController.getProfile] user:', user);
      console.log('[PromoteurController.getProfile] promoteurProfile:', user?.promoteurProfile);
      if (!user?.promoteurProfile) {
        console.log('[PromoteurController.getProfile] promoteurProfile is null, userId:', req.user!.id);
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile)
        .populate('badges.badgeId')
        .populate('teamMembers.userId', 'firstName lastName email');

      try {
        console.log('[PromoteurController.getProfile] userId:', req.user!.id, 'promoteurId:', user.promoteurProfile);
        console.log('[PromoteurController.getProfile] promoteur plan:', promoteur?.plan, 'subscriptionStatus:', promoteur?.subscriptionStatus);
      } catch (e) {}

      res.json({ promoteur });
    } catch (error) {
      console.error('Error fetching promoteur profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Create promoteur profile (onboarding)
   */
  static async createProfile(req: AuthRequest, res: Response) {
    try {
      const { organizationName, organizationType } = req.body;

      // Check if user already has promoteur profile
      const user = await User.findById(req.user!.id);
      if (user?.promoteurProfile) {
        return res.status(400).json({ message: 'Promoteur profile already exists' });
      }

      // Create onboarding checklist
      const onboardingChecklist = [
        { code: 'org_info', item: 'Compléter les informations de l\'organisation', completed: true, completedAt: new Date() },
        { code: 'kyc', item: 'Vérifier l\'identité (KYC)', completed: false },
        { code: 'company_docs', item: 'Uploader les documents de société', completed: false },
        { code: 'financial_proof', item: 'Prouver la capacité financière', completed: false },
        { code: 'first_project', item: 'Créer le premier projet', completed: false },
      ];

      // Create promoteur
      const promoteur = new Promoteur({
        user: req.user!.id,
        organizationName,
        organizationType: organizationType || 'small',
        plan: 'basique',
        subscriptionStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days trial
        kycStatus: 'pending',
        onboardingCompleted: false,
        onboardingProgress: 0,
        onboardingChecklist,
        complianceStatus: 'publie',
        hasAgrement: false,
        trustScore: 0,
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalLeadsReceived: 0,
      });

      OnboardingService.recalculate(promoteur);

      await promoteur.save();

      // Update user with promoteur reference
      user!.promoteurProfile = promoteur._id as any;
      if (!user!.roles.includes(Role.PROMOTEUR)) {
        user!.roles.push(Role.PROMOTEUR);
      }
      await user!.save();

      await AuditLogService.logFromRequest(
        req,
        'create_promoteur_profile',
        'promoteur',
        `Created promoteur profile for ${organizationName}`
      );

      res.status(201).json({ promoteur });
    } catch (error) {
      console.error('Error creating promoteur profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update promoteur profile
   */
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const allowedFields = [
        'organizationName',
        'companyAddress',
        'companyPhone',
        'companyEmail',
        'website',
        'description',
        'logo',
      ];

      const updates: any = {};
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      const promoteur = await Promoteur.findByIdAndUpdate(
        user.promoteurProfile,
        updates,
        { new: true, runValidators: true }
      );

      await AuditLogService.logFromRequest(
        req,
        'update_promoteur_profile',
        'promoteur',
        'Updated promoteur profile',
        'Promoteur',
        user.promoteurProfile.toString()
      );

      res.json({ promoteur });
    } catch (error) {
      console.error('Error updating promoteur profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Upload KYC documents
   */
  static async uploadKYCDocuments(req: AuthRequest, res: Response) {
    try {
      const { documents } = req.body; // Array of { type, url }

      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Add documents
      documents.forEach((doc: any) => {
        promoteur.kycDocuments.push({
          type: doc.type,
          url: doc.url,
          status: 'pending',
          uploadedAt: new Date(),
        });
      });

      promoteur.kycStatus = 'submitted';
      
      // Update onboarding progress
      const kycChecklistItem = promoteur.onboardingChecklist.find(
        item => item.code === 'kyc' || item.item.includes('KYC')
      );
      if (kycChecklistItem && !kycChecklistItem.completed) {
        kycChecklistItem.completed = true;
        kycChecklistItem.completedAt = new Date();
        OnboardingService.recalculate(promoteur);
      }

      await promoteur.save();

      await AuditLogService.logFromRequest(
        req,
        'upload_kyc_documents',
        'promoteur',
        `Uploaded ${documents.length} KYC documents`,
        'Promoteur',
        promoteur._id.toString()
      );

      res.json({ promoteur });
    } catch (error) {
      console.error('Error uploading KYC documents:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Upload financial proof
   */
  static async uploadFinancialProof(req: AuthRequest, res: Response) {
    try {
      const { documents, level } = req.body; // level: basic, medium, high

      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      documents.forEach((doc: any) => {
        promoteur.financialProofDocuments.push({
          url: doc.url,
          uploadedAt: new Date(),
        });
      });

      promoteur.financialProofLevel = level;

      // Update onboarding
      const financialChecklistItem = promoteur.onboardingChecklist.find(
        item => item.code === 'financial_proof' || item.item.includes('capacité financière')
      );
      if (financialChecklistItem && !financialChecklistItem.completed) {
        financialChecklistItem.completed = true;
        financialChecklistItem.completedAt = new Date();
        OnboardingService.recalculate(promoteur);
      }

      await promoteur.save();

      // Recalculate trust score
      await TrustScoreService.updateAllScores(promoteur._id.toString());

      res.json({ promoteur });
    } catch (error) {
      console.error('Error uploading financial proof:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get trust score and improvement suggestions
   */
  static async getTrustScore(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const suggestions = await TrustScoreService.getImprovementSuggestions(
        promoteur._id.toString()
      );

      res.json({
        trustScore: promoteur.trustScore,
        suggestions,
      });
    } catch (error) {
      console.error('Error getting trust score:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Add team member
   */
  static async addTeamMember(req: AuthRequest, res: Response) {
    try {
      const { userId, role } = req.body;

      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Check if user exists
      const teamUser = await User.findById(userId);
      if (!teamUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if already a team member
      const existingMember = promoteur.teamMembers.find(
        (m: any) => m.userId.toString() === userId
      );
      if (existingMember) {
        return res.status(400).json({ message: 'User is already a team member' });
      }

      promoteur.teamMembers.push({
        userId,
        role,
        addedAt: new Date(),
      });

      await promoteur.save();

      await AuditLogService.logFromRequest(
        req,
        'add_team_member',
        'promoteur',
        `Added team member ${teamUser.email} as ${role}`,
        'Promoteur',
        promoteur._id.toString()
      );

      res.json({ promoteur });
    } catch (error) {
      console.error('Error adding team member:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get onboarding checklist and progress
   */
  static async getOnboardingChecklist(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      res.json({
        checklist: promoteur.onboardingChecklist,
        onboardingProgress: promoteur.onboardingProgress,
        onboardingCompleted: promoteur.onboardingCompleted,
      });
    } catch (error) {
      console.error('Error fetching onboarding checklist:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update a checklist item
   */
  static async updateOnboardingChecklistItem(req: AuthRequest, res: Response) {
    try {
      const { itemId } = req.params;
      const { completed = true } = req.body;

      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const checklistItem = OnboardingService.findChecklistItem(promoteur, itemId);
      if (!checklistItem) {
        return res.status(404).json({ message: 'Checklist item not found' });
      }

      checklistItem.completed = Boolean(completed);
      checklistItem.completedAt = checklistItem.completed ? new Date() : undefined;

      OnboardingService.recalculate(promoteur);
      await promoteur.save();

      await AuditLogService.logFromRequest(
        req,
        'update_onboarding_checklist_item',
        'promoteur',
        `Updated onboarding checklist item: ${checklistItem.item}`,
        'Promoteur',
        promoteur._id.toString(),
        { item: checklistItem.item, completed: checklistItem.completed }
      );

      res.json({
        checklist: promoteur.onboardingChecklist,
        onboardingProgress: promoteur.onboardingProgress,
        onboardingCompleted: promoteur.onboardingCompleted,
      });
    } catch (error) {
      console.error('Error updating onboarding checklist:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get onboarding status and trial info
   */
  static async getOnboardingStatus(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const now = new Date();
      const trialEndsAt = promoteur.trialEndsAt;
      const trialActive = !!trialEndsAt && trialEndsAt > now && promoteur.subscriptionStatus === 'trial';
      const trialDaysRemaining = trialEndsAt
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      res.json({
        onboardingProgress: promoteur.onboardingProgress,
        onboardingCompleted: promoteur.onboardingCompleted,
        checklist: promoteur.onboardingChecklist,
        trialEndsAt,
        trialActive,
        trialDaysRemaining,
        complianceStatus: promoteur.complianceStatus || 'publie',
        complianceRequest: promoteur.complianceRequest,
      });
    } catch (error) {
      console.error('Error fetching onboarding status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Request compliance upgrade (publie -> conforme -> verifie)
   */
  static async requestComplianceUpgrade(req: AuthRequest, res: Response) {
    try {
      const { targetStatus, reason } = req.body;

      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile).populate('user');
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      if (!['conforme', 'verifie'].includes(targetStatus)) {
        return res.status(400).json({ message: 'Invalid targetStatus' });
      }

      const currentStatus = promoteur.complianceStatus || 'publie';
      const nextStatus = currentStatus === 'publie'
        ? 'conforme'
        : currentStatus === 'conforme'
          ? 'verifie'
          : null;

      if (!nextStatus || targetStatus !== nextStatus) {
        return res.status(400).json({ message: 'Invalid compliance upgrade request' });
      }

      if (promoteur.complianceRequest?.status === 'pending') {
        return res.status(400).json({ message: 'A compliance request is already pending' });
      }

      // Basic requirements
      if (targetStatus === 'conforme') {
        if (!promoteur.onboardingCompleted || promoteur.kycStatus === 'pending') {
          return res.status(400).json({ message: 'Onboarding completion and KYC submission required' });
        }
      }

      if (targetStatus === 'verifie') {
        if (currentStatus !== 'conforme') {
          return res.status(400).json({ message: 'Must be conforme before requesting verifie' });
        }
        if (promoteur.kycStatus !== 'verified' || promoteur.financialProofLevel === 'none') {
          return res.status(400).json({ message: 'KYC verification and financial proof required' });
        }
      }

      promoteur.complianceRequest = {
        requestedStatus: targetStatus,
        status: 'pending',
        requestedAt: new Date(),
        reason,
      };

      await promoteur.save();

      await NotificationService.createAdminNotification({
        type: 'system',
        title: 'Demande de conformité',
        message: `${promoteur.organizationName} demande le statut ${targetStatus}`,
        priority: 'high',
        link: `/admin/promoteurs/${promoteur._id}`,
      });

      await AuditLogService.logFromRequest(
        req,
        'request_compliance_upgrade',
        'promoteur',
        `Requested compliance upgrade to ${targetStatus}`,
        'Promoteur',
        promoteur._id.toString(),
        { targetStatus }
      );

      res.json({
        complianceStatus: promoteur.complianceStatus || 'publie',
        complianceRequest: promoteur.complianceRequest,
      });
    } catch (error) {
      console.error('Error requesting compliance upgrade:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Request plan upgrade - Now requires payment through Stripe
   */
  static async requestUpgrade(req: AuthRequest, res: Response) {
    try {
      const { newPlan } = req.body; // 'standard' or 'premium'

      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Cancel any existing plan change request
      if (promoteur.planChangeRequest) {
        promoteur.planChangeRequest = undefined;
        await promoteur.save();
      }

      // Validate upgrade path
      const planHierarchy = ['basique', 'standard', 'premium'];
      const currentIndex = planHierarchy.indexOf(promoteur.plan);
      const newIndex = planHierarchy.indexOf(newPlan);

      if (newIndex <= currentIndex) {
        return res.status(400).json({ message: 'Invalid upgrade plan' });
      }

      // Instead of auto-approving, create a payment session for the upgrade
      // Import required modules
      const { stripe, SUBSCRIPTION_PRICES } = await import('../config/stripe');

      // Créer ou récupérer le customer Stripe
      let stripeCustomerId = promoteur.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: promoteur.organizationName,
          metadata: {
            userId: user._id.toString(),
            promoteurId: promoteur._id.toString(),
          },
        });
        stripeCustomerId = customer.id;

        // Sauvegarder l'ID customer dans le promoteur
        await Promoteur.findByIdAndUpdate(promoteur._id, {
          stripeCustomerId: stripeCustomerId,
        });
      }

      // Calculate the price for the upgrade (full price of new plan)
      const newPrice = SUBSCRIPTION_PRICES[newPlan];

      if (newPrice <= 0) {
        return res.status(400).json({ message: 'Invalid upgrade amount' });
      }

      const promoteurUrl = process.env.PROMOTEUR_URL || 'http://localhost:8081';

      // Create checkout session for the upgrade payment
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'payment', // One-time payment for upgrade
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Upgrade vers le plan ${newPlan === 'standard' ? 'Standard' : 'Premium'}`,
                description: `Abonnement mensuel au plan ${newPlan}`,
              },
              unit_amount: newPrice,
            },
            quantity: 1,
          },
        ],
        success_url: `${promoteurUrl}/promoteur/pricing?upgrade_success=true&new_plan=${newPlan}`,
        cancel_url: `${promoteurUrl}/promoteur/pricing`,
        metadata: {
          userId: user._id.toString(),
          promoteurId: promoteur._id.toString(),
          upgradeFrom: promoteur.plan,
          upgradeTo: newPlan,
          paymentType: 'upgrade',
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error('Error creating upgrade payment session:', error);
      res.status(500).json({ message: 'Erreur lors de la création de la session de paiement', error: (error as Error).message });
    }
  }

  /**
   * Request plan downgrade
   */
  static async requestDowngrade(req: AuthRequest, res: Response) {
    try {
      const { targetPlan, reason, effectiveDate } = req.body;

      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Validate downgrade
      const { PlanLimitService } = await import('../services/PlanLimitService');
      const validation = await PlanLimitService.validatePlanChange(promoteur._id.toString(), targetPlan);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.reason });
      }

      // Create plan change request (will be reviewed by admin)
      promoteur.planChangeRequest = {
        requestedPlan: targetPlan,
        requestType: 'downgrade',
        requestedAt: new Date(),
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        status: 'pending',
        reason
      };

      await promoteur.save();

      await AuditLogService.logFromRequest(
        req,
        'request_plan_downgrade',
        'promoteur',
        `Requested downgrade to ${targetPlan}`,
        'Promoteur',
        promoteur._id.toString()
      );

      res.json({ planChangeRequest: promoteur.planChangeRequest });
    } catch (error) {
      console.error('Error requesting downgrade:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Request plan cancellation
   */
  static async requestCancel(req: AuthRequest, res: Response) {
    try {
      const { reason, effectiveDate } = req.body;

      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      // Create plan change request
      promoteur.planChangeRequest = {
        requestedPlan: null,
        requestType: 'cancel',
        requestedAt: new Date(),
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        status: 'pending',
        reason
      };

      await promoteur.save();

      await AuditLogService.logFromRequest(
        req,
        'request_plan_cancel',
        'promoteur',
        'Requested plan cancellation',
        'Promoteur',
        promoteur._id.toString()
      );

      res.json({ planChangeRequest: promoteur.planChangeRequest });
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Cancel pending plan change request
   */
  static async cancelPlanChangeRequest(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      if (!promoteur.planChangeRequest || promoteur.planChangeRequest.status !== 'pending') {
        return res.status(400).json({ message: 'No pending plan change request' });
      }

      promoteur.planChangeRequest = undefined;
      await promoteur.save();

      await AuditLogService.logFromRequest(
        req,
        'cancel_plan_change',
        'promoteur',
        'Cancelled pending plan change request',
        'Promoteur',
        promoteur._id.toString()
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error cancelling plan change:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get promoteur stats
   */
  static async getStats(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await Promoteur.findById(user.promoteurProfile);
      if (!promoteur) {
        return res.status(404).json({ message: 'Promoteur not found' });
      }

      const stats = {
        trustScore: promoteur.trustScore,
        totalProjects: promoteur.totalProjects,
        activeProjects: promoteur.activeProjects,
        completedProjects: promoteur.completedProjects,
        totalLeadsReceived: promoteur.totalLeadsReceived,
        averageResponseTime: promoteur.averageResponseTime,
        plan: promoteur.plan,
        subscriptionStatus: promoteur.subscriptionStatus,
        badges: promoteur.badges.length,
        onboardingProgress: promoteur.onboardingProgress,
        onboardingCompleted: promoteur.onboardingCompleted,
        complianceStatus: promoteur.complianceStatus || 'publie',
        complianceRequest: promoteur.complianceRequest,
      };

      res.json({ stats });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get plan limits info
   */
  static async getLimits(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const { PlanLimitService } = await import('../services/PlanLimitService');
      const limitsInfo = await PlanLimitService.getLimitsInfo(user.promoteurProfile.toString());

      res.json(limitsInfo);
    } catch (error) {
      console.error('Error getting limits:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get promoteur availability
   */
  static async getAvailability(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const availability = await Availability.findOne({ promoteur: user.promoteurProfile });
      res.json({ availability });
    } catch (error) {
      console.error('Error getting availability:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update promoteur availability
   */
  static async updateAvailability(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const { timezone, weeklySlots, blackoutDates } = req.body;

      const availability = await Availability.findOneAndUpdate(
        { promoteur: user.promoteurProfile },
        { timezone, weeklySlots, blackoutDates },
        { new: true, upsert: true }
      );

      await AuditLogService.logFromRequest(
        req,
        'update_availability',
        'promoteur',
        'Updated availability settings',
        'Promoteur',
        user.promoteurProfile.toString()
      );

      res.json({ availability });
    } catch (error) {
      console.error('Error updating availability:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Invite team member
   */
  static async inviteTeamMember(req: AuthRequest, res: Response) {
    try {
      console.log('[inviteTeamMember] req.body:', req.body);
      const user = await User.findById(req.user!.id);
      console.log('[inviteTeamMember] user.promoteurProfile:', user?.promoteurProfile);
      if (!user?.promoteurProfile) {
        console.log('[inviteTeamMember] promoteurProfile not found for user:', req.user!.id);
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const { email, role } = req.body;
      if (!email || !role) {
        console.log('[inviteTeamMember] Missing email or role:', req.body);
        return res.status(400).json({ message: 'Email and role are required' });
      }
      // Log Promoteur existence
      const promoteurId = user.promoteurProfile.toString();
      const promoteur = await require('../models/Promoteur').default.findById(promoteurId);
      console.log('[inviteTeamMember] Promoteur.findById:', promoteurId, promoteur);
      try {
        const invitation = await InvitationService.createInvitation(
          promoteurId,
          email,
          role,
          req.user!.id
        );
        console.log('[inviteTeamMember] Invitation created:', invitation);
        res.status(201).json({ invitation });
      } catch (serviceError: any) {
        console.log('[inviteTeamMember] Error from InvitationService:', serviceError);
        res.status(400).json({ message: serviceError.message });
      }
    } catch (error: any) {
      console.log('[inviteTeamMember] Unexpected error:', error);
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Resend a team invitation
   */
  static async resendInvitation(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }
      const invitationId = req.params.id;
      const invitation = await InvitationService.resendInvitation(
        invitationId, 
        user.promoteurProfile.toString(), 
        req.user!.id
      );
      res.json({ invitation });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get team invitations
   */
  static async getTeamInvitations(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const { status } = req.query;
      const invitations = await InvitationService.getInvitations(
        user.promoteurProfile.toString(),
        status as string
      );

      res.json({ invitations });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Accept team invitation
   */
  static async acceptInvitation(req: AuthRequest, res: Response) {
    try {
      const { token } = req.params;
      const result = await InvitationService.acceptInvitation(token, req.user!.id);

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Cancel team invitation
   */
  static async cancelInvitation(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const invitation = await InvitationService.cancelInvitation(
        req.params.id,
        user.promoteurProfile.toString()
      );

      res.json({ invitation });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Remove team member
   */
  static async removeTeamMember(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const promoteur = await InvitationService.removeTeamMember(
        user.promoteurProfile.toString(),
        req.params.userId,
        req.user!.id
      );

      res.json({ promoteur });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Update team member role
   */
  static async updateTeamMemberRole(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const { role } = req.body;
      const member = await InvitationService.updateTeamMemberRole(
        user.promoteurProfile.toString(),
        req.params.userId,
        role,
        req.user!.id
      );

      res.json({ member });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Transfer ownership
   */
  static async transferOwnership(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user?.promoteurProfile) {
        return res.status(404).json({ message: 'Promoteur profile not found' });
      }

      const { newOwnerId } = req.body;
      const promoteur = await InvitationService.transferOwnership(
        user.promoteurProfile.toString(),
        newOwnerId,
        req.user!.id
      );

      res.json({ promoteur });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}