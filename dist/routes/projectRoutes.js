"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const projectController_1 = require("../controllers/projectController");
const auth_1 = require("../middlewares/auth");
const promoteurRbac_1 = require("../middlewares/promoteurRbac");
const uploadValidation_1 = require("../middlewares/uploadValidation");
const planEntitlements_1 = require("../middlewares/planEntitlements");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const router = (0, express_1.Router)();
// Public routes (no auth required)
router.get('/', projectController_1.ProjectController.getProjects);
router.get('/featured', projectController_1.ProjectController.getFeaturedProjects);
router.get('/top-verified', projectController_1.ProjectController.getTopVerifiedProjects);
router.get('/:identifier', projectController_1.ProjectController.getProject);
router.get('/:id/media/:mediaType', projectController_1.ProjectController.getProjectMedia);
// Protected routes
router.post('/', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('createProjects'), (0, planEntitlements_1.requireProjectQuota)(), projectController_1.ProjectController.createProject);
router.put('/:id', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), projectController_1.ProjectController.updateProject);
router.get('/:id/changes-log', auth_1.authenticateJWT, projectController_1.ProjectController.getChangesLog);
router.delete('/:id', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('deleteProjects'), projectController_1.ProjectController.deleteProject);
router.post('/:id/submit', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), projectController_1.ProjectController.submitForPublication);
// Media management
router.post('/:id/media/cover', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), upload.single('file'), (0, uploadValidation_1.validateUpload)({ allowedCategories: ['image'], maxFileSize: 20 * 1024 * 1024, requireFile: true, fieldName: 'file' }), projectController_1.ProjectController.setProjectCoverImage);
router.post('/:id/media/:mediaType', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), upload.single('file'), (0, planEntitlements_1.requireMediaQuota)(), projectController_1.ProjectController.addProjectMedia);
router.delete('/:id/media/:mediaType', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), projectController_1.ProjectController.removeProjectMedia);
// Team assignment
router.get('/:id/team', projectController_1.ProjectController.getAssignedTeam);
router.post('/:id/team', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editTeam'), projectController_1.ProjectController.assignTeamMember);
router.delete('/:id/team', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editTeam'), projectController_1.ProjectController.removeTeamMember);
// Promoteur's own projects
router.get('/my/list', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('viewProjects'), projectController_1.ProjectController.getMyProjects);
// FAQ
router.post('/:id/faq', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), projectController_1.ProjectController.addFAQ);
// Delays & Risks
router.post('/:id/delay', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), projectController_1.ProjectController.reportDelay);
router.post('/:id/risk', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), projectController_1.ProjectController.reportRisk);
// Pause / Resume
router.patch('/:id/pause', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), projectController_1.ProjectController.pauseProject);
router.patch('/:id/resume', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, (0, promoteurRbac_1.requirePromoteurPermission)('editProjects'), projectController_1.ProjectController.resumeProject);
router.get('/:id/pause-history', projectController_1.ProjectController.getPauseHistory);
exports.default = router;
