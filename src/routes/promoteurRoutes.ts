import { Router } from 'express';
import { PromoteurController } from '../controllers/promoteurController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// All routes require authentication and promoteur role
router.use(authenticateJWT);
router.use(authorizeRoles(Role.PROMOTEUR, Role.ADMIN));

// Profile routes
router.get('/profile', PromoteurController.getProfile);
router.post('/profile', PromoteurController.createProfile);
router.put('/profile', PromoteurController.updateProfile);
router.get('/stats', PromoteurController.getStats);
router.get('/limits', PromoteurController.getLimits);

// KYC & Onboarding
router.post('/kyc/upload', PromoteurController.uploadKYCDocuments);
router.post('/financial-proof/upload', PromoteurController.uploadFinancialProof);
router.get('/onboarding/checklist', PromoteurController.getOnboardingChecklist);
router.patch('/onboarding/checklist/:itemId', PromoteurController.updateOnboardingChecklistItem);
router.get('/onboarding/status', PromoteurController.getOnboardingStatus);

// Trust score
router.get('/trust-score', PromoteurController.getTrustScore);

// Availability
router.get('/availability', PromoteurController.getAvailability);
router.put('/availability', PromoteurController.updateAvailability);

// Team management
router.post('/team/add', PromoteurController.addTeamMember);
router.post('/team/invite', PromoteurController.inviteTeamMember);
router.get('/team/invitations', PromoteurController.getTeamInvitations);
router.post('/team/invitations/:token/accept', PromoteurController.acceptInvitation);
router.delete('/team/invitations/:id', PromoteurController.cancelInvitation);
router.delete('/team/:userId', PromoteurController.removeTeamMember);
router.patch('/team/:userId/role', PromoteurController.updateTeamMemberRole);
router.post('/transfer-ownership', PromoteurController.transferOwnership);

// Plan management
router.post('/upgrade', PromoteurController.requestUpgrade);
router.post('/plan/downgrade', PromoteurController.requestDowngrade);
router.post('/plan/cancel', PromoteurController.requestCancel);
router.delete('/plan/change-request', PromoteurController.cancelPlanChangeRequest);

// Compliance workflow
router.post('/compliance/request', PromoteurController.requestComplianceUpgrade);

export default router;
