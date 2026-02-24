"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const templateController_1 = require("../controllers/templateController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Public routes (for promoteurs to use templates)
router.get('/', auth_1.authenticateJWT, templateController_1.TemplateController.getAll);
router.get('/slug/:slug', auth_1.authenticateJWT, templateController_1.TemplateController.getBySlug);
router.post('/render/:slug', auth_1.authenticateJWT, templateController_1.TemplateController.render);
router.get('/most-used', auth_1.authenticateJWT, templateController_1.TemplateController.getMostUsed);
// Admin routes
router.post('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), templateController_1.TemplateController.create);
router.put('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), templateController_1.TemplateController.update);
router.delete('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), templateController_1.TemplateController.delete);
router.post('/initialize-defaults', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), templateController_1.TemplateController.initializeDefaults);
exports.default = router;
