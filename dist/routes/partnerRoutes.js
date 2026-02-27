"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const partnerController_1 = require("../controllers/partnerController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (_req, file, cb) {
        const ext = path_1.default.extname(file.originalname);
        const base = `partner-logo-${Date.now()}`;
        cb(null, base + ext);
    },
});
const upload = (0, multer_1.default)({ storage });
// Public endpoints
router.get('/', partnerController_1.PartnerController.getPartners);
router.get('/featured', partnerController_1.PartnerController.getFeaturedPartners);
router.get('/admin', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), partnerController_1.PartnerController.getPartnersAdmin);
router.get('/:id', partnerController_1.PartnerController.getPartner);
// Authenticated client endpoints
router.post('/request', auth_1.authenticateJWT, partnerController_1.PartnerController.createServiceRequest);
router.get('/requests/my', auth_1.authenticateJWT, partnerController_1.PartnerController.getMyServiceRequests);
router.post('/requests/:id/rate', auth_1.authenticateJWT, partnerController_1.PartnerController.rateRequest);
// Admin endpoints
router.post('/admin/upload-logo', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), upload.single('file'), partnerController_1.PartnerController.uploadLogo);
router.post('/admin', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), partnerController_1.PartnerController.createPartner);
router.put('/admin/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), partnerController_1.PartnerController.updatePartner);
router.patch('/admin/:id/verify', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), partnerController_1.PartnerController.verifyPartner);
router.patch('/admin/requests/:id/assign', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), partnerController_1.PartnerController.assignRequest);
router.patch('/admin/requests/:id/complete', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), partnerController_1.PartnerController.completeRequest);
exports.default = router;
