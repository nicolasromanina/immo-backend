"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const promoteurController_1 = require("../controllers/promoteurController");
const promoteurDocumentController_1 = require("../controllers/promoteurDocumentController");
const auth_1 = require("../middlewares/auth");
const promoteurRbac_1 = require("../middlewares/promoteurRbac");
const planEntitlements_1 = require("../middlewares/planEntitlements");
const router = (0, express_1.Router)();
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const ext = path_1.default.extname(file.originalname);
        const base = file.fieldname + '-' + Date.now();
        cb(null, base + ext);
    }
});
const upload = (0, multer_1.default)({ storage });
// All routes require authentication
router.use(auth_1.authenticateJWT);
// Profile creation remains accessible to authenticated users without existing promoteurProfile
router.post('/profile', promoteurController_1.PromoteurController.createProfile);
// Remaining routes require promoteur organization access
router.use(promoteurRbac_1.requirePromoteurAccess);
// Profile routes
router.get('/profile', (0, promoteurRbac_1.requirePromoteurPermission)('viewReports'), promoteurController_1.PromoteurController.getProfile);
router.put('/profile', (0, promoteurRbac_1.requirePromoteurPermission)('editSettings'), promoteurController_1.PromoteurController.updateProfile);
router.get('/stats', (0, promoteurRbac_1.requirePromoteurPermission)('viewReports'), promoteurController_1.PromoteurController.getStats);
router.get('/limits', (0, promoteurRbac_1.requirePromoteurPermission)('viewReports'), promoteurController_1.PromoteurController.getLimits);
// KYC & Onboarding
router.post('/kyc/upload', (0, promoteurRbac_1.requirePromoteurPermission)('editSettings'), promoteurController_1.PromoteurController.uploadKYCDocuments);
router.delete('/kyc/upload/:id', (0, promoteurRbac_1.requirePromoteurPermission)('editSettings'), promoteurController_1.PromoteurController.deleteKYCDocument);
router.post('/financial-proof/upload', (0, promoteurRbac_1.requirePromoteurPermission)('editSettings'), promoteurController_1.PromoteurController.uploadFinancialProof);
router.post('/company-documents/upload', (0, promoteurRbac_1.requirePromoteurPermission)('editSettings'), promoteurController_1.PromoteurController.uploadCompanyDocument);
router.delete('/company-documents/:id', (0, promoteurRbac_1.requirePromoteurPermission)('editSettings'), promoteurController_1.PromoteurController.deleteCompanyDocument);
router.get('/onboarding/checklist', (0, promoteurRbac_1.requirePromoteurPermission)('viewReports'), promoteurController_1.PromoteurController.getOnboardingChecklist);
router.patch('/onboarding/checklist/:itemId', (0, promoteurRbac_1.requirePromoteurPermission)('editSettings'), promoteurController_1.PromoteurController.updateOnboardingChecklistItem);
router.get('/onboarding/status', (0, promoteurRbac_1.requirePromoteurPermission)('viewReports'), promoteurController_1.PromoteurController.getOnboardingStatus);
// Trust score
router.get('/trust-score', (0, promoteurRbac_1.requirePromoteurPermission)('viewReports'), promoteurController_1.PromoteurController.getTrustScore);
// Trust score history for promoteur (self)
router.get('/trust-score/history', (0, promoteurRbac_1.requirePromoteurPermission)('viewReports'), promoteurController_1.PromoteurController.getTrustScoreHistory);
// Availability
router.get('/availability', (0, promoteurRbac_1.requirePromoteurPermission)('viewReports'), promoteurController_1.PromoteurController.getAvailability);
router.put('/availability', (0, promoteurRbac_1.requirePromoteurPermission)('editSettings'), promoteurController_1.PromoteurController.updateAvailability);
// Team management
router.post('/team/add', (0, promoteurRbac_1.requirePromoteurPermission)('addTeamMembers'), promoteurController_1.PromoteurController.addTeamMember);
router.post('/team/invite', (0, promoteurRbac_1.requirePromoteurPermission)('addTeamMembers'), promoteurController_1.PromoteurController.inviteTeamMember);
router.post('/team/invitations/:id/resend', (0, promoteurRbac_1.requirePromoteurPermission)('addTeamMembers'), promoteurController_1.PromoteurController.resendInvitation);
router.get('/team/invitations', (0, promoteurRbac_1.requirePromoteurPermission)('viewTeam'), promoteurController_1.PromoteurController.getTeamInvitations);
// NOTE: /team/invitations/:token/accept is now in publicPromoteurRoutes for non-PROMOTEUR users
router.delete('/team/invitations/:id', (0, promoteurRbac_1.requirePromoteurPermission)('removeTeamMembers'), promoteurController_1.PromoteurController.cancelInvitation);
router.delete('/team/:userId', (0, promoteurRbac_1.requirePromoteurPermission)('removeTeamMembers'), promoteurController_1.PromoteurController.removeTeamMember);
router.patch('/team/:userId/role', (0, promoteurRbac_1.requirePromoteurPermission)('changeRoles'), promoteurController_1.PromoteurController.updateTeamMemberRole);
router.post('/transfer-ownership', (0, promoteurRbac_1.requirePromoteurPermission)('changeRoles'), promoteurController_1.PromoteurController.transferOwnership);
// Plan management
router.post('/upgrade', (0, promoteurRbac_1.requirePromoteurPermission)('manageBilling'), promoteurController_1.PromoteurController.requestUpgrade);
router.post('/plan/downgrade', (0, promoteurRbac_1.requirePromoteurPermission)('manageBilling'), promoteurController_1.PromoteurController.requestDowngrade);
router.post('/plan/cancel', (0, promoteurRbac_1.requirePromoteurPermission)('manageBilling'), promoteurController_1.PromoteurController.requestCancel);
router.delete('/plan/change-request', (0, promoteurRbac_1.requirePromoteurPermission)('manageBilling'), promoteurController_1.PromoteurController.cancelPlanChangeRequest);
// Compliance workflow
// Upload file (Cloudinary)
router.post('/upload', upload.single('file'), promoteurController_1.PromoteurController.uploadFile);
router.post('/upload-doc', upload.single('file'), promoteurDocumentController_1.PromoteurDocumentController.uploadDocumentFile);
router.post('/compliance/request', (0, promoteurRbac_1.requirePromoteurPermission)('editSettings'), promoteurController_1.PromoteurController.requestComplianceUpgrade);
// Analytics endpoints
router.get('/analytics/dashboard', (0, promoteurRbac_1.requirePromoteurPermission)('viewAnalytics'), (0, planEntitlements_1.requirePlanCapability)('advancedAnalytics'), promoteurController_1.PromoteurController.getAnalytics);
router.get('/analytics/leads-timeline', (0, promoteurRbac_1.requirePromoteurPermission)('viewAnalytics'), (0, planEntitlements_1.requirePlanCapability)('advancedAnalytics'), promoteurController_1.PromoteurController.getLeadsTimeline);
router.get('/analytics/revenue-forecast', (0, promoteurRbac_1.requirePromoteurPermission)('viewAnalytics'), (0, planEntitlements_1.requirePlanCapability)('advancedAnalytics'), promoteurController_1.PromoteurController.getRevenueForecast);
router.get('/analytics/growth-dashboard', (0, promoteurRbac_1.requirePromoteurPermission)('viewAnalytics'), (0, planEntitlements_1.requirePlanCapability)('advancedAnalytics'), promoteurController_1.PromoteurController.getGrowthDashboard);
exports.default = router;
