"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ABTestController_1 = require("../controllers/ABTestController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// All A/B Testing routes require authentication and promoteur role
router.use(auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN));
// Get all tests for the authenticated user
router.get('/', ABTestController_1.ABTestController.getTests);
// Create a new A/B test
router.post('/', ABTestController_1.ABTestController.createTest);
// Get a specific A/B test
router.get('/:testId', ABTestController_1.ABTestController.getTest);
// Record an event (view, click, conversion)
router.post('/event', ABTestController_1.ABTestController.recordEvent);
// Stop a test (determine winner)
router.put('/:testId/stop', ABTestController_1.ABTestController.stopTest);
// Delete a test
router.delete('/:testId', ABTestController_1.ABTestController.deleteTest);
exports.default = router;
