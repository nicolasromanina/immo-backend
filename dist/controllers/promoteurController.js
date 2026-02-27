"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromoteurController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const User_1 = __importDefault(require("../models/User"));
const AuditLogService_1 = require("../services/AuditLogService");
const TrustScoreService_1 = require("../services/TrustScoreService");
const AdvancedTrustScoreService_1 = require("../services/AdvancedTrustScoreService");
const OnboardingService_1 = require("../services/OnboardingService");
const NotificationService_1 = require("../services/NotificationService");
const roles_1 = require("../config/roles");
const Availability_1 = __importDefault(require("../models/Availability"));
const InvitationService_1 = require("../services/InvitationService");
const jwt_1 = require("../config/jwt");
class PromoteurController {
    /**
     * Supprime un document KYC du promoteur
     */
    static async deleteKYCDocument(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const docId = req.params.id;
            const beforeCount = promoteur.kycDocuments.length;
            promoteur.kycDocuments = promoteur.kycDocuments.filter((doc) => (doc._id?.toString() || doc.id?.toString()) !== docId);
            if (promoteur.kycDocuments.length === beforeCount) {
                return res.status(404).json({ message: 'Document KYC non trouvé' });
            }
            await promoteur.save();
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'delete_kyc_document', 'promoteur', `Suppression d'un document KYC`, 'Promoteur', promoteur._id.toString());
            res.json({ success: true });
        }
        catch (error) {
            console.error('Erreur suppression document KYC:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }
    /**
     * Upload file to Cloudinary for media (images, videos) or local storage for documents
     */
    static async uploadFile(req, res) {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ message: 'Aucun fichier fourni' });
            }
            // Check if it's a media file (image, video)
            const isMediaFile = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
            if (isMediaFile) {
                // Upload media to Cloudinary
                const cloudinary = require('cloudinary').v2;
                cloudinary.config({
                    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                    api_key: process.env.CLOUDINARY_API_KEY,
                    api_secret: process.env.CLOUDINARY_API_SECRET,
                });
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: 'promoteur',
                });
                // Delete local temp file
                const fs = require('fs').promises;
                try {
                    await fs.unlink(file.path);
                }
                catch (e) {
                    // Ignore error if file can't be deleted
                }
                res.json({ url: result.secure_url });
            }
            else {
                // Documents (PDF, DOC, etc) are stored locally in uploads/
                // Return full URL with backend port to avoid browser resolving to frontend port
                const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
                const url = `${backendUrl}/uploads/${file.filename}`;
                res.json({ url });
            }
        }
        catch (error) {
            console.error('Error uploading file:', error);
            res.status(500).json({ message: 'Erreur upload fichier' });
        }
    }
    /**
     * Get promoteur profile
     */
    static async getProfile(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id).populate('promoteurProfile');
            console.log('[PromoteurController.getProfile] user:', user);
            console.log('[PromoteurController.getProfile] promoteurProfile:', user?.promoteurProfile);
            if (!user?.promoteurProfile) {
                console.log('[PromoteurController.getProfile] promoteurProfile is null, userId:', req.user.id);
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile)
                .populate('badges.badgeId')
                .populate('teamMembers.userId', 'firstName lastName email');
            try {
                console.log('[PromoteurController.getProfile] userId:', req.user.id, 'promoteurId:', user.promoteurProfile);
                console.log('[PromoteurController.getProfile] promoteur plan:', promoteur?.plan, 'subscriptionStatus:', promoteur?.subscriptionStatus);
            }
            catch (e) { }
            res.json({ promoteur });
        }
        catch (error) {
            console.error('Error fetching promoteur profile:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Create promoteur profile (onboarding)
     */
    static async createProfile(req, res) {
        try {
            const { organizationName, organizationType } = req.body;
            // Check if user already has promoteur profile
            const user = await User_1.default.findById(req.user.id);
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
            const promoteur = new Promoteur_1.default({
                user: req.user.id,
                organizationName,
                organizationType: organizationType || 'small',
                plan: 'starter',
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
            OnboardingService_1.OnboardingService.recalculate(promoteur);
            await promoteur.save();
            // Update user with promoteur reference
            user.promoteurProfile = promoteur._id;
            if (!user.roles.includes(roles_1.Role.PROMOTEUR)) {
                user.roles.push(roles_1.Role.PROMOTEUR);
            }
            await user.save();
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'create_promoteur_profile', 'promoteur', `Created promoteur profile for ${organizationName}`);
            res.status(201).json({ promoteur });
        }
        catch (error) {
            console.error('Error creating promoteur profile:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update promoteur profile
     */
    static async updateProfile(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
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
            const updates = {};
            Object.keys(req.body).forEach(key => {
                if (allowedFields.includes(key)) {
                    updates[key] = req.body[key];
                }
            });
            const promoteur = await Promoteur_1.default.findByIdAndUpdate(user.promoteurProfile, updates, { new: true, runValidators: true });
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'update_promoteur_profile', 'promoteur', 'Updated promoteur profile', 'Promoteur', user.promoteurProfile.toString());
            res.json({ promoteur });
        }
        catch (error) {
            console.error('Error updating promoteur profile:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Upload KYC documents
     */
    static async uploadKYCDocuments(req, res) {
        try {
            const { documents } = req.body; // Array of { type, url }
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            // Add documents
            documents.forEach((doc) => {
                promoteur.kycDocuments.push({
                    type: doc.type,
                    url: doc.url,
                    status: 'pending',
                    uploadedAt: new Date(),
                });
            });
            promoteur.kycStatus = 'submitted';
            // Update onboarding progress
            const kycChecklistItem = promoteur.onboardingChecklist.find(item => item.code === 'kyc' || item.item.includes('KYC'));
            if (kycChecklistItem && !kycChecklistItem.completed) {
                kycChecklistItem.completed = true;
                kycChecklistItem.completedAt = new Date();
                OnboardingService_1.OnboardingService.recalculate(promoteur);
            }
            await promoteur.save();
            // kycStatus vient de passer à 'submitted' (+10 pts) : recalculer le score
            await TrustScoreService_1.TrustScoreService.updateAllScores(promoteur._id.toString());
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'upload_kyc_documents', 'promoteur', `Uploaded ${documents.length} KYC documents`, 'Promoteur', promoteur._id.toString());
            res.json({ promoteur });
        }
        catch (error) {
            console.error('Error uploading KYC documents:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Upload financial proof
     */
    static async uploadFinancialProof(req, res) {
        try {
            const { documents, level } = req.body; // level: basic, medium, high
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            documents.forEach((doc) => {
                promoteur.financialProofDocuments.push({
                    url: doc.url,
                    uploadedAt: new Date(),
                    status: 'pending',
                    rejectionReason: '',
                });
            });
            promoteur.financialProofLevel = level;
            // Update onboarding
            const financialChecklistItem = promoteur.onboardingChecklist.find(item => item.code === 'financial_proof' || item.item.includes('capacité financière'));
            if (financialChecklistItem && !financialChecklistItem.completed) {
                financialChecklistItem.completed = true;
                financialChecklistItem.completedAt = new Date();
                OnboardingService_1.OnboardingService.recalculate(promoteur);
            }
            await promoteur.save();
            // Recalculate trust score
            await TrustScoreService_1.TrustScoreService.updateAllScores(promoteur._id.toString());
            res.json({ promoteur });
        }
        catch (error) {
            console.error('Error uploading financial proof:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Upload company documents
     */
    static async uploadCompanyDocument(req, res) {
        try {
            const { type, url, name } = req.body;
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            promoteur.companyDocuments.push({
                type,
                url,
                name,
                uploadedAt: new Date(),
                status: 'pending',
                rejectionReason: '',
            });
            await promoteur.save();
            res.json({ promoteur });
        }
        catch (error) {
            console.error('Error uploading company document:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Delete company document
     */
    static async deleteCompanyDocument(req, res) {
        try {
            const { id } = req.params;
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const docIndex = promoteur.companyDocuments.findIndex((d) => d._id?.toString() === id);
            if (docIndex === -1) {
                return res.status(404).json({ message: 'Company document not found' });
            }
            promoteur.companyDocuments.splice(docIndex, 1);
            await promoteur.save();
            res.json({ promoteur });
        }
        catch (error) {
            console.error('Error deleting company document:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get trust score and improvement suggestions
     */
    static async getTrustScore(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const suggestions = await TrustScoreService_1.TrustScoreService.getImprovementSuggestions(promoteur._id.toString());
            res.json({
                trustScore: promoteur.trustScore,
                suggestions,
            });
        }
        catch (error) {
            console.error('Error getting trust score:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get trust score history for current promoteur
     */
    static async getTrustScoreHistory(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteurId = user.promoteurProfile.toString();
            const days = req.query.days ? parseInt(req.query.days) : 30;
            const history = await AdvancedTrustScoreService_1.AdvancedTrustScoreService.getScoreHistory(promoteurId, days);
            res.json({ history });
        }
        catch (error) {
            console.error('Error getting trust score history:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Add team member
     */
    static async addTeamMember(req, res) {
        try {
            const { userId, role } = req.body;
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
            const canAddTeamMember = await PlanLimitService.checkTeamMemberLimit(promoteur._id.toString());
            if (!canAddTeamMember) {
                return res.status(403).json({
                    message: 'Limite de membres d equipe atteinte pour votre plan',
                    upgrade: true,
                });
            }
            // Check if user exists
            const teamUser = await User_1.default.findById(userId);
            if (!teamUser) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Check if already a team member
            const existingMember = promoteur.teamMembers.find((m) => m.userId.toString() === userId);
            if (existingMember) {
                return res.status(400).json({ message: 'User is already a team member' });
            }
            promoteur.teamMembers.push({
                userId,
                role,
                addedAt: new Date(),
            });
            await promoteur.save();
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'add_team_member', 'promoteur', `Added team member ${teamUser.email} as ${role}`, 'Promoteur', promoteur._id.toString());
            res.json({ promoteur });
        }
        catch (error) {
            console.error('Error adding team member:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get onboarding checklist and progress
     */
    static async getOnboardingChecklist(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            // Initialize onboarding checklist if it's empty
            let shouldPersist = false;
            if (!promoteur.onboardingChecklist || promoteur.onboardingChecklist.length === 0) {
                promoteur.onboardingChecklist = [
                    { code: 'org_info', item: 'Completer les informations de l\'organisation', completed: true, completedAt: new Date() },
                    { code: 'kyc', item: 'Verifier l\'identite (KYC)', completed: false },
                    { code: 'company_docs', item: 'Uploader les documents de societe', completed: false },
                    { code: 'financial_proof', item: 'Prouver la capacite financiere', completed: false },
                    { code: 'first_project', item: 'Creer le premier projet', completed: false },
                ];
                shouldPersist = true;
            }
            // Always recalculate to ensure data is up-to-date after admin approvals
            OnboardingService_1.OnboardingService.recalculate(promoteur);
            shouldPersist = true;
            if (shouldPersist) {
                try {
                    await Promoteur_1.default.findByIdAndUpdate(promoteur._id, {
                        $set: {
                            onboardingChecklist: promoteur.onboardingChecklist,
                            onboardingProgress: promoteur.onboardingProgress,
                            onboardingCompleted: promoteur.onboardingCompleted,
                        },
                    });
                }
                catch (persistError) {
                    // Do not fail the GET endpoint if persistence fails.
                    console.error('Error persisting onboarding checklist snapshot:', persistError);
                }
            }
            res.json({
                checklist: promoteur.onboardingChecklist,
                onboardingProgress: promoteur.onboardingProgress,
                onboardingCompleted: promoteur.onboardingCompleted,
            });
        }
        catch (error) {
            console.error('Error fetching onboarding checklist:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update a checklist item
     */
    static async updateOnboardingChecklistItem(req, res) {
        try {
            const { itemId } = req.params;
            const { completed = true } = req.body;
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const checklistItem = OnboardingService_1.OnboardingService.findChecklistItem(promoteur, itemId);
            if (!checklistItem) {
                return res.status(404).json({ message: 'Checklist item not found' });
            }
            checklistItem.completed = Boolean(completed);
            checklistItem.completedAt = checklistItem.completed ? new Date() : undefined;
            OnboardingService_1.OnboardingService.recalculate(promoteur);
            await promoteur.save();
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'update_onboarding_checklist_item', 'promoteur', `Updated onboarding checklist item: ${checklistItem.item}`, 'Promoteur', promoteur._id.toString(), { item: checklistItem.item, completed: checklistItem.completed });
            res.json({
                checklist: promoteur.onboardingChecklist,
                onboardingProgress: promoteur.onboardingProgress,
                onboardingCompleted: promoteur.onboardingCompleted,
            });
        }
        catch (error) {
            console.error('Error updating onboarding checklist:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get onboarding status and trial info
     */
    static async getOnboardingStatus(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
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
        }
        catch (error) {
            console.error('Error fetching onboarding status:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Request compliance upgrade (publie -> conforme -> verifie)
     */
    static async requestComplianceUpgrade(req, res) {
        try {
            const { targetStatus, reason } = req.body;
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile).populate('user');
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
            await NotificationService_1.NotificationService.createAdminNotification({
                type: 'system',
                title: 'Demande de conformité',
                message: `${promoteur.organizationName} demande le statut ${targetStatus}`,
                priority: 'high',
                link: `/admin/promoteurs/${promoteur._id}`,
            });
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'request_compliance_upgrade', 'promoteur', `Requested compliance upgrade to ${targetStatus}`, 'Promoteur', promoteur._id.toString(), { targetStatus });
            res.json({
                complianceStatus: promoteur.complianceStatus || 'publie',
                complianceRequest: promoteur.complianceRequest,
            });
        }
        catch (error) {
            console.error('Error requesting compliance upgrade:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Request plan upgrade - Now requires payment through Stripe
     */
    static async requestUpgrade(req, res) {
        try {
            const { newPlan } = req.body; // 'publie', 'verifie', 'partenaire'
            if (newPlan === 'enterprise') {
                return res.status(400).json({ message: 'Le plan Enterprise nécessite de contacter notre équipe commerciale.' });
            }
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            // Cancel any existing plan change request without full-document validation
            if (promoteur.planChangeRequest) {
                await Promoteur_1.default.findByIdAndUpdate(promoteur._id, {
                    $unset: { planChangeRequest: 1 }
                });
                promoteur.planChangeRequest = undefined;
            }
            // Validate upgrade path using PLAN_HIERARCHY
            const { PLAN_HIERARCHY } = await Promise.resolve().then(() => __importStar(require('../config/planLimits')));
            const currentLevel = PLAN_HIERARCHY[promoteur.plan] ?? -1;
            const newLevel = PLAN_HIERARCHY[newPlan] ?? -1;
            if (newLevel <= currentLevel) {
                return res.status(400).json({ message: 'Invalid upgrade plan' });
            }
            // Instead of auto-approving, create a payment session for the upgrade
            // Import required modules
            const { stripe, SUBSCRIPTION_PRICES, SETUP_FEES, BILLING_INTERVAL } = await Promise.resolve().then(() => __importStar(require('../config/stripe')));
            // Créer ou récupérer le customer Stripe
            let stripeCustomerId = promoteur.stripeCustomerId;
            if (stripeCustomerId) {
                try {
                    const existingCustomer = await stripe.customers.retrieve(stripeCustomerId);
                    if (existingCustomer?.deleted) {
                        stripeCustomerId = undefined;
                    }
                }
                catch {
                    stripeCustomerId = undefined;
                }
            }
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
                await Promoteur_1.default.findByIdAndUpdate(promoteur._id, {
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
            const planLabels = {
                starter: 'Starter',
                publie: 'Publié',
                verifie: 'Vérifié',
                partenaire: 'Partenaire',
            };
            const setupFee = SETUP_FEES[newPlan] || 0;
            const upgradeSessionParams = {
                customer: stripeCustomerId,
                payment_method_types: ['card'],
                mode: 'subscription',
                line_items: [
                    {
                        price_data: {
                            currency: 'eur',
                            product_data: {
                                name: `Upgrade vers le plan ${planLabels[newPlan] || newPlan}`,
                                description: `Abonnement annuel au plan ${newPlan}`,
                            },
                            unit_amount: newPrice,
                            recurring: {
                                interval: BILLING_INTERVAL,
                            },
                        },
                        quantity: 1,
                    },
                ],
                success_url: `${promoteurUrl}/promoteur/pricing?upgrade_success=true&new_plan=${newPlan}&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${promoteurUrl}/promoteur/pricing`,
                metadata: {
                    userId: user._id.toString(),
                    promoteurId: promoteur._id.toString(),
                    upgradeFrom: promoteur.plan,
                    upgradeTo: newPlan,
                    paymentType: 'upgrade',
                    setupFeeAmount: setupFee.toString(),
                },
            };
            if (setupFee > 0) {
                upgradeSessionParams.line_items.push({
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Frais de mise en place - Plan ${planLabels[newPlan] || newPlan}`,
                        },
                        unit_amount: setupFee,
                    },
                    quantity: 1,
                });
            }
            const session = await stripe.checkout.sessions.create(upgradeSessionParams);
            res.json({ sessionId: session.id, url: session.url });
        }
        catch (error) {
            console.error('Error creating upgrade payment session:', error);
            res.status(500).json({ message: 'Erreur lors de la création de la session de paiement', error: error.message });
        }
    }
    /**
     * Request plan downgrade
     */
    static async requestDowngrade(req, res) {
        try {
            const { targetPlan, reason, effectiveDate } = req.body;
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            // Validate downgrade direction using PLAN_HIERARCHY
            const { PLAN_HIERARCHY } = await Promise.resolve().then(() => __importStar(require('../config/planLimits')));
            const currentLevel = PLAN_HIERARCHY[promoteur.plan] ?? -1;
            const targetLevel = PLAN_HIERARCHY[targetPlan] ?? -1;
            if (targetLevel >= currentLevel) {
                return res.status(400).json({ message: 'Le plan cible doit être inférieur au plan actuel pour un downgrade.' });
            }
            // Validate downgrade capacity
            const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
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
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'request_plan_downgrade', 'promoteur', `Requested downgrade to ${targetPlan}`, 'Promoteur', promoteur._id.toString());
            res.json({ planChangeRequest: promoteur.planChangeRequest });
        }
        catch (error) {
            console.error('Error requesting downgrade:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Request plan cancellation
     */
    static async requestCancel(req, res) {
        try {
            const { reason, effectiveDate } = req.body;
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
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
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'request_plan_cancel', 'promoteur', 'Requested plan cancellation', 'Promoteur', promoteur._id.toString());
            res.json({ planChangeRequest: promoteur.planChangeRequest });
        }
        catch (error) {
            console.error('Error requesting cancellation:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Cancel pending plan change request
     */
    static async cancelPlanChangeRequest(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findOneAndUpdate({
                _id: user.promoteurProfile,
                'planChangeRequest.status': 'pending'
            }, {
                $unset: { planChangeRequest: 1 }
            }, { new: true });
            if (!promoteur) {
                return res.json({ success: true, alreadyCleared: true });
            }
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'cancel_plan_change', 'promoteur', 'Cancelled pending plan change request', 'Promoteur', promoteur._id.toString());
            res.json({ success: true });
        }
        catch (error) {
            console.error('Error cancelling plan change:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get promoteur stats
     */
    static async getStats(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
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
        }
        catch (error) {
            console.error('Error getting stats:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get plan limits info
     */
    static async getLimits(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
            const limitsInfo = await PlanLimitService.getLimitsInfo(user.promoteurProfile.toString());
            res.json(limitsInfo);
        }
        catch (error) {
            console.error('Error getting limits:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get promoteur availability
     */
    static async getAvailability(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const availability = await Availability_1.default.findOne({ promoteur: user.promoteurProfile });
            res.json({ availability });
        }
        catch (error) {
            console.error('Error getting availability:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update promoteur availability
     */
    static async updateAvailability(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const { timezone, weeklySlots, blackoutDates } = req.body;
            const availability = await Availability_1.default.findOneAndUpdate({ promoteur: user.promoteurProfile }, { timezone, weeklySlots, blackoutDates }, { new: true, upsert: true });
            await AuditLogService_1.AuditLogService.logFromRequest(req, 'update_availability', 'promoteur', 'Updated availability settings', 'Promoteur', user.promoteurProfile.toString());
            res.json({ availability });
        }
        catch (error) {
            console.error('Error updating availability:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Invite team member
     */
    static async inviteTeamMember(req, res) {
        try {
            console.log('[inviteTeamMember] req.body:', req.body);
            const user = await User_1.default.findById(req.user.id);
            console.log('[inviteTeamMember] user.promoteurProfile:', user?.promoteurProfile);
            if (!user?.promoteurProfile) {
                console.log('[inviteTeamMember] promoteurProfile not found for user:', req.user.id);
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
                const invitation = await InvitationService_1.InvitationService.createInvitation(promoteurId, email, role, req.user.id);
                console.log('[inviteTeamMember] Invitation created:', invitation);
                res.status(201).json({ invitation });
            }
            catch (serviceError) {
                console.log('[inviteTeamMember] Error from InvitationService:', serviceError);
                res.status(400).json({ message: serviceError.message });
            }
        }
        catch (error) {
            console.log('[inviteTeamMember] Unexpected error:', error);
            res.status(400).json({ message: error.message });
        }
    }
    /**
     * Resend a team invitation
     */
    static async resendInvitation(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const invitationId = req.params.id;
            const invitation = await InvitationService_1.InvitationService.resendInvitation(invitationId, user.promoteurProfile.toString(), req.user.id);
            res.json({ invitation });
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    /**
     * Get team invitations
     */
    static async getTeamInvitations(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const { status } = req.query;
            const invitations = await InvitationService_1.InvitationService.getInvitations(user.promoteurProfile.toString(), status);
            res.json({ invitations });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    /**
     * Accept team invitation
     */
    static async acceptInvitation(req, res) {
        try {
            const { token } = req.params;
            console.log('[acceptInvitation] Controller called - token:', token, 'userId:', req.user.id);
            const result = await InvitationService_1.InvitationService.acceptInvitation(token, req.user.id);
            console.log('[acceptInvitation] Invitation accepted, user roles:', result.user?.roles);
            // Après avoir accepté l'invitation, générer un nouveau JWT avec les nouveaux rôles
            console.log('[acceptInvitation] Generating new JWT with updated roles...');
            const newJWT = jsonwebtoken_1.default.sign({
                id: result.user._id,
                roles: result.user.roles
            }, (0, jwt_1.getJwtSecret)(), { expiresIn: '24h' });
            console.log('[acceptInvitation] New JWT generated with roles:', result.user.roles);
            res.json({
                ...result,
                newJWT
            });
        }
        catch (error) {
            console.log('[acceptInvitation] Error:', error.message);
            res.status(400).json({ message: error.message });
        }
    }
    /**
     * Cancel team invitation
     */
    static async cancelInvitation(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const invitation = await InvitationService_1.InvitationService.cancelInvitation(req.params.id, user.promoteurProfile.toString());
            res.json({ invitation });
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    /**
     * Remove team member
     */
    static async removeTeamMember(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await InvitationService_1.InvitationService.removeTeamMember(user.promoteurProfile.toString(), req.params.userId, req.user.id);
            res.json({ promoteur });
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    /**
     * Update team member role
     */
    static async updateTeamMemberRole(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const { role } = req.body;
            const member = await InvitationService_1.InvitationService.updateTeamMemberRole(user.promoteurProfile.toString(), req.params.userId, role, req.user.id);
            res.json({ member });
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    /**
     * Transfer ownership
     */
    static async transferOwnership(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const { newOwnerId } = req.body;
            const promoteur = await InvitationService_1.InvitationService.transferOwnership(user.promoteurProfile.toString(), newOwnerId, req.user.id);
            res.json({ promoteur });
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    /**
     * Get detailed analytics for promoteur dashboard
     */
    static async getAnalytics(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const Lead = require('../models/Lead').default;
            const Project = require('../models/Project').default;
            // Lead conversion stats (A -> B -> C -> D)
            const allLeads = await Lead.find({ promoteur: promoteur._id });
            const scoreA = allLeads.filter((l) => l.score === 'A').length;
            const scoreB = allLeads.filter((l) => l.score === 'B').length;
            const scoreC = allLeads.filter((l) => l.score === 'C').length;
            const scoreD = allLeads.filter((l) => l.score === 'D').length;
            const conversionStats = {
                totalLeads: allLeads.length,
                scoreA,
                scoreB,
                scoreC,
                scoreD,
                conversionRate: {
                    aToB: scoreA > 0 ?
                        (allLeads.filter((l) => l.status === 'contacte' && l.score === 'A').length /
                            scoreA * 100).toFixed(1) : '0.0',
                    bToC: scoreB > 0 ?
                        (allLeads.filter((l) => l.status === 'rdv-planifie' && l.score === 'B').length /
                            scoreB * 100).toFixed(1) : '0.0',
                    cToD: scoreC > 0 ?
                        (allLeads.filter((l) => l.status === 'proposition-envoyee' && l.score === 'C').length /
                            scoreC * 100).toFixed(1) : '0.0',
                }
            };
            // ROI par projet
            const projects = await Project.find({ promoteur: promoteur._id });
            const roiPerProject = projects.map((p) => {
                const projectLeads = allLeads.filter((l) => l.project?.toString() === p._id.toString());
                const wonLeads = projectLeads.filter((l) => l.status === 'gagne');
                return {
                    projectId: p._id,
                    projectTitle: p.title,
                    totalLeads: projectLeads.length,
                    wonLeads: wonLeads.length,
                    conversionRate: projectLeads.length > 0 ?
                        ((wonLeads.length / projectLeads.length) * 100).toFixed(1) : 0,
                    averageLeadValue: projectLeads.length > 0 ?
                        (projectLeads.reduce((sum, l) => sum + (l.budget || 0), 0) / projectLeads.length).toFixed(0) : 0,
                };
            });
            // Annual revenue estimate (based on leads A/B with conversion probability)
            const highQualityLeads = allLeads.filter((l) => l.score === 'A' || l.score === 'B');
            const avgBudget = highQualityLeads.length > 0 ?
                highQualityLeads.reduce((sum, l) => sum + (l.budget || 0), 0) / highQualityLeads.length : 0;
            const conversionRate = highQualityLeads.length > 0 ?
                (allLeads.filter((l) => l.status === 'gagne').length / highQualityLeads.length) * 100 : 0;
            const estimatedAnnualRevenue = (avgBudget * highQualityLeads.length * (conversionRate / 100)).toFixed(0);
            // Time series data (30, 60, 90 days)
            const calculateTimeSeries = (days) => {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                return {
                    leadsCreated: allLeads.filter((l) => new Date(l.createdAt) >= startDate).length,
                    projectsCreated: projects.filter((p) => new Date(p.createdAt) >= startDate).length,
                    avgTrustScore: promoteur.trustScore,
                };
            };
            const timeSeries = {
                days30: calculateTimeSeries(30),
                days60: calculateTimeSeries(60),
                days90: calculateTimeSeries(90),
            };
            // Benchmarking - compare with other verified promoteurs
            const areaPromoteurs = await Promoteur_1.default.find({
                _id: { $ne: promoteur._id },
                complianceStatus: 'verifie'
            }).select('trustScore totalLeadsReceived activeProjects');
            const avgTrustScore = areaPromoteurs.length > 0 ?
                (areaPromoteurs.reduce((sum, p) => sum + p.trustScore, 0) / areaPromoteurs.length) : 0;
            const benchmarking = {
                yourTrustScore: promoteur.trustScore,
                averageTrustScore: avgTrustScore.toFixed(1),
                percentile: areaPromoteurs.length > 0 ?
                    ((areaPromoteurs.filter((p) => p.trustScore < promoteur.trustScore).length / areaPromoteurs.length) * 100).toFixed(1) : 0,
                competitorCount: areaPromoteurs.length,
            };
            res.json({
                conversionStats,
                roiPerProject,
                estimatedAnnualRevenue,
                timeSeries,
                benchmarking,
            });
        }
        catch (error) {
            console.error('Error getting analytics:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get leads timeline data for charts
     */
    static async getLeadsTimeline(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const { period = '30' } = req.query;
            const days = parseInt(period) || 30;
            const Lead = require('../models/Lead').default;
            const timeline = [];
            for (let i = days; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);
                const dayLeads = await Lead.find({
                    promoteur: user.promoteurProfile,
                    createdAt: { $gte: date, $lt: nextDate }
                });
                timeline.push({
                    date: date.toISOString().split('T')[0],
                    total: dayLeads.length,
                    scoreA: dayLeads.filter((l) => l.score === 'A').length,
                    scoreB: dayLeads.filter((l) => l.score === 'B').length,
                    completed: dayLeads.filter((l) => l.status === 'gagne').length,
                });
            }
            res.json({ timeline });
        }
        catch (error) {
            console.error('Error getting leads timeline:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get revenue forecast based on leads
     */
    static async getRevenueForecast(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const Lead = require('../models/Lead').default;
            const allLeads = await Lead.find({ promoteur: user.promoteurProfile });
            // Calculate based on lead scores and conversion history
            const scoreALeads = allLeads.filter((l) => l.score === 'A');
            const scoreBLeads = allLeads.filter((l) => l.score === 'B');
            const wonLeads = allLeads.filter((l) => l.status === 'gagne');
            const avgLeadValue = allLeads.length > 0 ?
                allLeads.reduce((sum, l) => sum + (l.budget || 0), 0) / allLeads.length : 0;
            const conversionRateA = scoreALeads.length > 0 ?
                scoreALeads.filter((l) => l.status === 'gagne').length / scoreALeads.length : 0;
            const conversionRateB = scoreBLeads.length > 0 ?
                scoreBLeads.filter((l) => l.status === 'gagne').length / scoreBLeads.length : 0;
            const forecast = {
                conservativeEstimate: (scoreALeads.length * avgLeadValue * conversionRateA).toFixed(0),
                optimisticEstimate: ((scoreALeads.length + scoreBLeads.length) * avgLeadValue * ((conversionRateA + conversionRateB) / 2)).toFixed(0),
                historicalRevenue: (wonLeads.reduce((sum, l) => sum + (l.budget || 0), 0)).toFixed(0),
                avgConversionRate: ((conversionRateA + conversionRateB) / 2 * 100).toFixed(1),
            };
            res.json(forecast);
        }
        catch (error) {
            console.error('Error getting revenue forecast:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get growth dashboard data: active campaigns (ads, A/B tests, boosts, featured slots)
     * and dynamic recommendations based on promoteur's current activity.
     */
    static async getGrowthDashboard(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user?.promoteurProfile) {
                return res.status(404).json({ message: 'Promoteur profile not found' });
            }
            const promoteur = await Promoteur_1.default.findById(user.promoteurProfile);
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const Ad = require('../models/Ad').default;
            const ABTest = require('../models/ABTest').default;
            const Payment = require('../models/Payment').default;
            const FeaturedSlot = require('../models/FeaturedSlot').default;
            const Lead = require('../models/Lead').default;
            const Project = require('../models/Project').default;
            // 1. Active Ads
            const ads = await Ad.find({ promoteur: promoteur._id })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();
            // 2. Active A/B Tests
            const abTests = await ABTest.find({ promoteurId: promoteur._id })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();
            // 3. Active Boost payments
            const boostPayments = await Payment.find({
                promoteur: promoteur._id,
                type: 'boost',
                status: 'succeeded',
            })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();
            // 4. Featured Slots
            let featuredSlots = [];
            try {
                featuredSlots = await FeaturedSlot.find({
                    $or: [
                        { entity: promoteur._id },
                        { promoteur: promoteur._id },
                    ]
                })
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .lean();
            }
            catch (e) {
                // FeaturedSlot may not have matching field
            }
            // Build unified campaigns list
            const campaigns = [];
            // Map ads to campaigns
            for (const ad of ads) {
                const statusMap = {
                    'active': 'active',
                    'pending-review': 'pending',
                    'draft': 'draft',
                    'paused': 'paused',
                    'completed': 'completed',
                    'rejected': 'rejected',
                    'expired': 'expired',
                };
                campaigns.push({
                    id: ad._id,
                    name: ad.title || ad.creative?.headline || `Campagne publicitaire`,
                    type: 'ad',
                    adType: ad.type,
                    status: statusMap[ad.status] || ad.status,
                    metrics: ad.metrics || { impressions: 0, clicks: 0, conversions: 0, ctr: 0 },
                    budget: ad.budget || {},
                    createdAt: ad.createdAt,
                });
            }
            // Map A/B tests to campaigns
            for (const test of abTests) {
                const totalViews = (test.variants || []).reduce((sum, v) => sum + (v.views || 0), 0);
                const totalClicks = (test.variants || []).reduce((sum, v) => sum + (v.clicks || 0), 0);
                const improvement = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(0) : '0';
                campaigns.push({
                    id: test._id,
                    name: `A/B Test - ${test.testType === 'description' ? 'Descriptions' : 'Images'}`,
                    type: 'ab-test',
                    status: test.status === 'active' ? 'active' : test.status === 'completed' ? 'completed' : 'paused',
                    metrics: {
                        views: totalViews,
                        clicks: totalClicks,
                        improvement: `+${improvement}%`,
                    },
                    winner: test.winnerVariantId || null,
                    createdAt: test.createdAt,
                });
            }
            // Map boosts to campaigns
            for (const payment of boostPayments) {
                const bd = payment.boostDetails || {};
                const isActive = bd.endDate ? new Date(bd.endDate) > new Date() : false;
                // Try to get project name
                let projectName = 'Projet';
                if (bd.projectId) {
                    try {
                        const project = await Project.findById(bd.projectId).select('title name').lean();
                        if (project)
                            projectName = project.title || project.name || 'Projet';
                    }
                    catch (e) { }
                }
                campaigns.push({
                    id: payment._id,
                    name: `Boost - ${projectName}`,
                    type: 'boost',
                    boostType: bd.boostType || 'basic',
                    status: isActive ? 'active' : 'expired',
                    amount: payment.amount,
                    startDate: bd.startDate,
                    endDate: bd.endDate,
                    createdAt: payment.createdAt,
                });
            }
            // Map featured slots
            for (const slot of featuredSlots) {
                campaigns.push({
                    id: slot._id,
                    name: `Mise en avant - ${slot.placement || 'annuaires'}`,
                    type: 'featured',
                    status: slot.status === 'active' ? 'active' : slot.status,
                    metrics: {
                        impressions: slot.impressions || 0,
                        clicks: slot.clicks || 0,
                    },
                    createdAt: slot.createdAt,
                });
            }
            // Sort by most recent
            campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            // Compute summary stats
            const activeCampaigns = campaigns.filter((c) => c.status === 'active');
            const totalImpressions = campaigns.reduce((sum, c) => sum + (c.metrics?.impressions || 0), 0);
            const totalClicks = campaigns.reduce((sum, c) => sum + (c.metrics?.clicks || 0), 0);
            const totalConversions = campaigns.reduce((sum, c) => sum + (c.metrics?.conversions || 0), 0);
            const totalSpent = campaigns
                .filter((c) => c.type === 'ad')
                .reduce((sum, c) => sum + (c.budget?.spent || 0), 0);
            // Generate dynamic recommendations
            const recommendations = [];
            const leadCount = await Lead.countDocuments({ promoteur: promoteur._id });
            const projectCount = await Project.countDocuments({ promoteur: promoteur._id, status: { $in: ['published', 'active'] } });
            const hasActiveAds = ads.some((a) => a.status === 'active');
            const hasActiveTests = abTests.some((t) => t.status === 'active');
            const hasBoosts = boostPayments.length > 0;
            if (!hasActiveTests && projectCount > 0) {
                recommendations.push({
                    icon: '🎯',
                    title: 'Optimisez avec A/B Testing',
                    description: `Vous avez ${projectCount} projet(s) actif(s). Testez différentes descriptions pour augmenter vos conversions.`,
                    action: '/ab-testing',
                    priority: 'high',
                });
            }
            if (!hasBoosts && projectCount > 0) {
                recommendations.push({
                    icon: '⚡',
                    title: 'Boostez vos projets',
                    description: 'Les projets boostés reçoivent en moyenne 3x plus de visibilité sur la plateforme.',
                    action: '/boost-project',
                    priority: 'high',
                });
            }
            if (!hasActiveAds && leadCount > 5) {
                recommendations.push({
                    icon: '📧',
                    title: 'Lancez une campagne publicitaire',
                    description: `Avec ${leadCount} leads, une campagne ciblée pourrait convertir davantage de prospects.`,
                    action: '/ads',
                    priority: 'medium',
                });
            }
            if (hasActiveTests) {
                const activeTests = abTests.filter((t) => t.status === 'active');
                recommendations.push({
                    icon: '📊',
                    title: `${activeTests.length} test(s) A/B en cours`,
                    description: 'Consultez les résultats pour optimiser vos descriptions et images.',
                    action: '/ab-testing',
                    priority: 'low',
                });
            }
            if (activeCampaigns.length === 0 && recommendations.length === 0) {
                recommendations.push({
                    icon: '🚀',
                    title: 'Commencez par un boost',
                    description: 'Mettez en avant vos meilleurs projets pour attirer plus de leads qualifiés.',
                    action: '/boost-project',
                    priority: 'high',
                }, {
                    icon: '🎯',
                    title: 'Testez vos contenus',
                    description: 'L\'A/B Testing vous aide à trouver les descriptions les plus performantes.',
                    action: '/ab-testing',
                    priority: 'medium',
                }, {
                    icon: '📧',
                    title: 'Campagnes email',
                    description: 'Contactez directement les leads intéressés pour accélérer vos ventes.',
                    action: '/ads',
                    priority: 'medium',
                });
            }
            res.json({
                campaigns,
                summary: {
                    totalCampaigns: campaigns.length,
                    activeCampaigns: activeCampaigns.length,
                    totalImpressions,
                    totalClicks,
                    totalConversions,
                    totalSpent,
                },
                recommendations,
                tools: {
                    boost: { count: boostPayments.length, active: boostPayments.filter((p) => p.boostDetails?.endDate && new Date(p.boostDetails.endDate) > new Date()).length },
                    abTests: { count: abTests.length, active: abTests.filter((t) => t.status === 'active').length },
                    ads: { count: ads.length, active: ads.filter((a) => a.status === 'active').length },
                    featured: { count: featuredSlots.length, active: featuredSlots.filter((s) => s.status === 'active').length },
                },
            });
        }
        catch (error) {
            console.error('Error getting growth dashboard:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.PromoteurController = PromoteurController;
