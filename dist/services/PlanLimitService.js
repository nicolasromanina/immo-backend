"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanLimitService = void 0;
const planLimits_1 = require("../config/planLimits");
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const Project_1 = __importDefault(require("../models/Project"));
class PlanLimitService {
    /**
     * Check if a promoteur can create a new project
     */
    static async checkProjectLimit(promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return false;
        const limits = planLimits_1.PLAN_LIMITS[promoteur.plan];
        if (limits.maxProjects === -1)
            return true; // unlimited
        return promoteur.totalProjects < limits.maxProjects;
    }
    /**
     * Check if a promoteur can add a new team member
     */
    static async checkTeamMemberLimit(promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return false;
        const limits = planLimits_1.PLAN_LIMITS[promoteur.plan];
        if (limits.maxTeamMembers === -1)
            return true; // unlimited
        return promoteur.teamMembers.length < limits.maxTeamMembers;
    }
    /**
     * Check if a promoteur can have more active projects
     */
    static async checkActiveProjectLimit(promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return false;
        const limits = planLimits_1.PLAN_LIMITS[promoteur.plan];
        if (limits.maxActiveProjects === -1)
            return true; // unlimited
        return promoteur.activeProjects < limits.maxActiveProjects;
    }
    /**
     * Get current limits info for a promoteur
     */
    static async getLimitsInfo(promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            throw new Error('Promoteur not found');
        const limits = planLimits_1.PLAN_LIMITS[promoteur.plan];
        // Count active projects (not archived or suspended)
        const activeProjectsCount = await Project_1.default.countDocuments({
            promoteur: promoteurId,
            status: { $nin: ['archive', 'suspended'] }
        });
        const canCreateProject = limits.maxProjects === -1 || promoteur.totalProjects < limits.maxProjects;
        const canAddTeamMember = limits.maxTeamMembers === -1 || promoteur.teamMembers.length < limits.maxTeamMembers;
        return {
            plan: promoteur.plan,
            limits,
            currentProjects: promoteur.totalProjects,
            currentActiveProjects: activeProjectsCount,
            currentTeamMembers: promoteur.teamMembers.length,
            canCreateProject,
            canAddTeamMember
        };
    }
    /**
     * Validate if a plan change is allowed
     */
    static async validatePlanChange(promoteurId, targetPlan) {
        if (!targetPlan)
            return { valid: true }; // cancel is always allowed
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return { valid: false, reason: 'Promoteur not found' };
        const currentLimits = planLimits_1.PLAN_LIMITS[promoteur.plan];
        const targetLimits = planLimits_1.PLAN_LIMITS[targetPlan];
        // Check if current usage exceeds target plan limits
        if (targetLimits.maxProjects !== -1 && promoteur.totalProjects > targetLimits.maxProjects) {
            return { valid: false, reason: `Current project count (${promoteur.totalProjects}) exceeds target plan limit (${targetLimits.maxProjects})` };
        }
        if (targetLimits.maxTeamMembers !== -1 && promoteur.teamMembers.length > targetLimits.maxTeamMembers) {
            return { valid: false, reason: `Current team members (${promoteur.teamMembers.length}) exceed target plan limit (${targetLimits.maxTeamMembers})` };
        }
        // Check active projects
        const activeProjectsCount = await Project_1.default.countDocuments({
            promoteur: promoteurId,
            status: { $nin: ['archive', 'suspended'] }
        });
        if (targetLimits.maxActiveProjects !== -1 && activeProjectsCount > targetLimits.maxActiveProjects) {
            return { valid: false, reason: `Current active projects (${activeProjectsCount}) exceed target plan limit (${targetLimits.maxActiveProjects})` };
        }
        return { valid: true };
    }
}
exports.PlanLimitService = PlanLimitService;
