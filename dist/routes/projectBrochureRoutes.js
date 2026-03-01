"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const projectBrochureController_1 = require("../controllers/projectBrochureController");
const auth_1 = require("../middlewares/auth");
const promoteurRbac_1 = require("../middlewares/promoteurRbac");
const uploadValidation_1 = require("../middlewares/uploadValidation");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const router = (0, express_1.Router)();
// Public: Get project brochure (for clients)
router.get('/project/:projectId', projectBrochureController_1.ProjectBrochureController.getProjectBrochure);
// Track download
router.post('/project/:projectId/track-download', projectBrochureController_1.ProjectBrochureController.trackDownload);
// Protected: Upload brochure for project
router.post('/project/:projectId/upload', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, upload.single('file'), (0, uploadValidation_1.validateUpload)({
    allowedCategories: ['document'],
    maxFileSize: 50 * 1024 * 1024, // 50MB for brochures
    requireFile: true,
    fieldName: 'file',
}), projectBrochureController_1.ProjectBrochureController.uploadBrochure);
// Protected: Delete brochure
router.delete('/project/:projectId', auth_1.authenticateJWT, promoteurRbac_1.requirePromoteurAccess, projectBrochureController_1.ProjectBrochureController.deleteBrochure);
// Public: Download brochure by ID (for brochure requests)
router.get('/download/:brochureId', projectBrochureController_1.ProjectBrochureController.downloadBrochure);
exports.default = router;
