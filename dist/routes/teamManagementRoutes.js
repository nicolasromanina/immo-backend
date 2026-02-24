"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const teamManagementController_1 = __importDefault(require("../controllers/teamManagementController"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateJWT);
// Get team members
router.get('/members', teamManagementController_1.default.getTeamMembers);
// Create/update team role
router.post('/roles', teamManagementController_1.default.createTeamRole);
// Assign lead to team member
router.post('/assign-lead', teamManagementController_1.default.assignLead);
// Get team activity log
router.get('/activity-log', teamManagementController_1.default.getTeamActivityLog);
// Get team member assignments
router.get('/assignments/:userId', teamManagementController_1.default.getTeamMemberAssignments);
// Get member modification history
router.get('/history/:userId', teamManagementController_1.default.getMemberModificationHistory);
// Update team member role
router.put('/member-role', teamManagementController_1.default.updateTeamMemberRole);
exports.default = router;
