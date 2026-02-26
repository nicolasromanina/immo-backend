import { Router } from 'express';
import multer from 'multer';
import { PromoteurController } from '../controllers/promoteurController';
import { PromoteurDocumentController } from '../controllers/promoteurDocumentController';
import { authenticateJWT } from '../middlewares/auth';
import { requirePromoteurAccess, requirePromoteurPermission } from '../middlewares/promoteurRbac';
import { requirePlanCapability } from '../middlewares/planEntitlements';

const router = Router();
import path from 'path';
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'uploads/');
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname);
		const base = file.fieldname + '-' + Date.now();
		cb(null, base + ext);
	}
});
const upload = multer({ storage });

// All routes require authentication
router.use(authenticateJWT);

// Profile creation remains accessible to authenticated users without existing promoteurProfile
router.post('/profile', PromoteurController.createProfile);

// Remaining routes require promoteur organization access
router.use(requirePromoteurAccess);

// Profile routes
router.get('/profile', requirePromoteurPermission('viewReports'), PromoteurController.getProfile);
router.put('/profile', requirePromoteurPermission('editSettings'), PromoteurController.updateProfile);
router.get('/stats', requirePromoteurPermission('viewReports'), PromoteurController.getStats);
router.get('/limits', requirePromoteurPermission('viewReports'), PromoteurController.getLimits);

// KYC & Onboarding
router.post('/kyc/upload', requirePromoteurPermission('editSettings'), PromoteurController.uploadKYCDocuments);
router.delete('/kyc/upload/:id', requirePromoteurPermission('editSettings'), PromoteurController.deleteKYCDocument);
router.post('/financial-proof/upload', requirePromoteurPermission('editSettings'), PromoteurController.uploadFinancialProof);
router.post('/company-documents/upload', requirePromoteurPermission('editSettings'), PromoteurController.uploadCompanyDocument);
router.delete('/company-documents/:id', requirePromoteurPermission('editSettings'), PromoteurController.deleteCompanyDocument);
router.get('/onboarding/checklist', requirePromoteurPermission('viewReports'), PromoteurController.getOnboardingChecklist);
router.patch('/onboarding/checklist/:itemId', requirePromoteurPermission('editSettings'), PromoteurController.updateOnboardingChecklistItem);
router.get('/onboarding/status', requirePromoteurPermission('viewReports'), PromoteurController.getOnboardingStatus);

// Trust score
router.get('/trust-score', requirePromoteurPermission('viewReports'), PromoteurController.getTrustScore);

// Trust score history for promoteur (self)
router.get('/trust-score/history', requirePromoteurPermission('viewReports'), PromoteurController.getTrustScoreHistory);

// Availability
router.get('/availability', requirePromoteurPermission('viewReports'), PromoteurController.getAvailability);
router.put('/availability', requirePromoteurPermission('editSettings'), PromoteurController.updateAvailability);

// Team management
router.post('/team/add', requirePromoteurPermission('addTeamMembers'), PromoteurController.addTeamMember);
router.post('/team/invite', requirePromoteurPermission('addTeamMembers'), PromoteurController.inviteTeamMember);
router.post('/team/invitations/:id/resend', requirePromoteurPermission('addTeamMembers'), PromoteurController.resendInvitation);
router.get('/team/invitations', requirePromoteurPermission('viewTeam'), PromoteurController.getTeamInvitations);
// NOTE: /team/invitations/:token/accept is now in publicPromoteurRoutes for non-PROMOTEUR users
router.delete('/team/invitations/:id', requirePromoteurPermission('removeTeamMembers'), PromoteurController.cancelInvitation);
router.delete('/team/:userId', requirePromoteurPermission('removeTeamMembers'), PromoteurController.removeTeamMember);
router.patch('/team/:userId/role', requirePromoteurPermission('changeRoles'), PromoteurController.updateTeamMemberRole);
router.post('/transfer-ownership', requirePromoteurPermission('changeRoles'), PromoteurController.transferOwnership);

// Plan management
router.post('/upgrade', requirePromoteurPermission('manageBilling'), PromoteurController.requestUpgrade);
router.post('/plan/downgrade', requirePromoteurPermission('manageBilling'), PromoteurController.requestDowngrade);
router.post('/plan/cancel', requirePromoteurPermission('manageBilling'), PromoteurController.requestCancel);
router.delete('/plan/change-request', requirePromoteurPermission('manageBilling'), PromoteurController.cancelPlanChangeRequest);

// Compliance workflow
// Upload file (Cloudinary)
router.post('/upload', upload.single('file'), PromoteurController.uploadFile);
router.post('/upload-doc', upload.single('file'), PromoteurDocumentController.uploadDocumentFile);
router.post('/compliance/request', requirePromoteurPermission('editSettings'), PromoteurController.requestComplianceUpgrade);

// Analytics endpoints
router.get('/analytics/dashboard', requirePromoteurPermission('viewAnalytics'), requirePlanCapability('advancedAnalytics'), PromoteurController.getAnalytics);
router.get('/analytics/leads-timeline', requirePromoteurPermission('viewAnalytics'), requirePlanCapability('advancedAnalytics'), PromoteurController.getLeadsTimeline);
router.get('/analytics/revenue-forecast', requirePromoteurPermission('viewAnalytics'), requirePlanCapability('advancedAnalytics'), PromoteurController.getRevenueForecast);
router.get('/analytics/growth-dashboard', requirePromoteurPermission('viewAnalytics'), requirePlanCapability('advancedAnalytics'), PromoteurController.getGrowthDashboard);

export default router;
