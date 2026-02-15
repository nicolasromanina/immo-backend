import { Router } from 'express';
import multer from 'multer';
import { PromoteurController } from '../controllers/promoteurController';
import { PromoteurDocumentController } from '../controllers/promoteurDocumentController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

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
router.delete('/kyc/upload/:id', PromoteurController.deleteKYCDocument);
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
router.post('/team/invitations/:id/resend', PromoteurController.resendInvitation);
router.get('/team/invitations', PromoteurController.getTeamInvitations);
// NOTE: /team/invitations/:token/accept is now in publicPromoteurRoutes for non-PROMOTEUR users
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
// Upload file (Cloudinary)
router.post('/upload', upload.single('file'), PromoteurController.uploadFile);
router.post('/upload-doc', upload.single('file'), PromoteurDocumentController.uploadDocumentFile);
router.post('/compliance/request', PromoteurController.requestComplianceUpgrade);

// Analytics endpoints
router.get('/analytics/dashboard', PromoteurController.getAnalytics);
router.get('/analytics/leads-timeline', PromoteurController.getLeadsTimeline);
router.get('/analytics/revenue-forecast', PromoteurController.getRevenueForecast);

export default router;
