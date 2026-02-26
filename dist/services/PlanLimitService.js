"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanLimitService = void 0;
const planLimits_1 = require("../config/planLimits");
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const Project_1 = __importDefault(require("../models/Project"));
const Document_1 = __importDefault(require("../models/Document"));
const Update_1 = __importDefault(require("../models/Update"));
class PlanLimitService {
    static async getPromoteurPlan(promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId).select('plan');
        if (!promoteur)
            return null;
        return (0, planLimits_1.normalizePlan)(promoteur.plan);
    }
    /**
     * Check if a promoteur can create a new project
     */
    static async checkProjectLimit(promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId).select('plan totalProjects');
        if (!promoteur)
            return false;
        const plan = (0, planLimits_1.normalizePlan)(promoteur.plan);
        const limits = planLimits_1.PLAN_LIMITS[plan];
        if (limits.maxProjects === -1)
            return true; // unlimited
        return promoteur.totalProjects < limits.maxProjects;
    }
    /**
     * Check if a promoteur can add a new team member
     */
    static async checkTeamMemberLimit(promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId).select('plan teamMembers');
        if (!promoteur)
            return false;
        const plan = (0, planLimits_1.normalizePlan)(promoteur.plan);
        const limits = planLimits_1.PLAN_LIMITS[plan];
        if (limits.maxTeamMembers === -1)
            return true; // unlimited
        return promoteur.teamMembers.length < limits.maxTeamMembers;
    }
    /**
     * Check if a promoteur can have more active projects
     */
    static async checkActiveProjectLimit(promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId).select('plan activeProjects');
        if (!promoteur)
            return false;
        const plan = (0, planLimits_1.normalizePlan)(promoteur.plan);
        const limits = planLimits_1.PLAN_LIMITS[plan];
        if (limits.maxActiveProjects === -1)
            return true; // unlimited
        return promoteur.activeProjects < limits.maxActiveProjects;
    }
    /**
     * Check if a promoteur can upload more media for a project
     */
    static async checkMediaLimit(promoteurId, currentMediaCount) {
        const promoteur = await Promoteur_1.default.findById(promoteurId).select('plan');
        if (!promoteur)
            return false;
        const plan = (0, planLimits_1.normalizePlan)(promoteur.plan);
        const limits = planLimits_1.PLAN_LIMITS[plan];
        if (limits.maxMediaPerProject === -1)
            return true; // unlimited
        return currentMediaCount < limits.maxMediaPerProject;
    }
    /**
     * Check if a promoteur can upload more documents for a project
     */
    static async checkDocumentLimit(promoteurId, currentDocCount) {
        const promoteur = await Promoteur_1.default.findById(promoteurId).select('plan');
        if (!promoteur)
            return false;
        const plan = (0, planLimits_1.normalizePlan)(promoteur.plan);
        const limits = planLimits_1.PLAN_LIMITS[plan];
        if (limits.maxDocuments === -1)
            return true; // unlimited
        return currentDocCount < limits.maxDocuments;
    }
    /**
     * Get current limits info for a promoteur
     */
    static async getLimitsInfo(promoteurId) {
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            throw new Error('Promoteur not found');
        const plan = (0, planLimits_1.normalizePlan)(promoteur.plan);
        const limits = planLimits_1.PLAN_LIMITS[plan];
        const capabilities = planLimits_1.PLAN_CAPABILITIES[plan];
        // Count active projects (not archived or suspended)
        const activeProjectsCount = await Project_1.default.countDocuments({
            promoteur: promoteurId,
            status: { $nin: ['archive', 'suspended'] }
        });
        const canCreateProject = limits.maxProjects === -1 || promoteur.totalProjects < limits.maxProjects;
        const canAddTeamMember = limits.maxTeamMembers === -1 || promoteur.teamMembers.length < limits.maxTeamMembers;
        return {
            plan,
            limits,
            capabilities,
            currentProjects: promoteur.totalProjects,
            currentActiveProjects: activeProjectsCount,
            currentTeamMembers: promoteur.teamMembers.length,
            canCreateProject,
            canAddTeamMember
        };
    }
    /**
     * Validate if a plan change is allowed (checks usage against target limits)
     */
    static async validatePlanChange(promoteurId, targetPlan) {
        if (!targetPlan)
            return { valid: true }; // cancel is always allowed
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur)
            return { valid: false, reason: 'Promoteur not found' };
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
    /**
     * Check if target plan is an upgrade from current plan using PLAN_HIERARCHY
     */
    static isUpgrade(currentPlan, targetPlan) {
        return planLimits_1.PLAN_HIERARCHY[targetPlan] > planLimits_1.PLAN_HIERARCHY[currentPlan];
    }
    /**
     * Check if target plan is a downgrade from current plan using PLAN_HIERARCHY
     */
    static isDowngrade(currentPlan, targetPlan) {
        return planLimits_1.PLAN_HIERARCHY[targetPlan] < planLimits_1.PLAN_HIERARCHY[currentPlan];
    }
    /**
     * Check if a capability is available for a promoteur plan
     */
    static async checkCapability(promoteurId, capability) {
        const plan = await this.getPromoteurPlan(promoteurId);
        if (!plan)
            return false;
        return planLimits_1.PLAN_CAPABILITIES[plan][capability];
    }
    /**
     * Check monthly updates quota for a promoteur (current month)
     */
    static async checkMonthlyUpdateLimit(promoteurId, toAdd = 1) {
        const plan = await this.getPromoteurPlan(promoteurId);
        if (!plan)
            return { allowed: false, limit: 0, current: 0 };
        const limit = planLimits_1.PLAN_LIMITS[plan].maxUpdatesPerMonth;
        if (limit === -1)
            return { allowed: true, limit, current: 0 };
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const current = await Update_1.default.countDocuments({
            promoteur: promoteurId,
            createdAt: { $gte: monthStart, $lt: nextMonthStart },
        });
        return {
            allowed: current + Math.max(0, toAdd) <= limit,
            limit,
            current,
        };
    }
    /**
     * Check per-project media/video quota according to promoteur plan
     */
    static async checkProjectMediaLimit(promoteurId, projectId, mediaType, toAdd = 1) {
        const plan = await this.getPromoteurPlan(promoteurId);
        if (!plan)
            return { allowed: false, limit: 0, current: 0 };
        const project = await Project_1.default.findById(projectId).select('media');
        if (!project)
            return { allowed: false, limit: 0, current: 0 };
        const limits = planLimits_1.PLAN_LIMITS[plan];
        const media = project.media || {};
        if (mediaType === 'videos') {
            const limit = limits.maxVideos;
            const current = Array.isArray(media.videos) ? media.videos.length : 0;
            if (limit === -1)
                return { allowed: true, limit, current };
            return { allowed: current + Math.max(0, toAdd) <= limit, limit, current };
        }
        const limit = limits.maxMediaPerProject;
        const current = (Array.isArray(media.renderings) ? media.renderings.length : 0) +
            (Array.isArray(media.photos) ? media.photos.length : 0) +
            (Array.isArray(media.floorPlans) ? media.floorPlans.length : 0);
        if (limit === -1)
            return { allowed: true, limit, current };
        return { allowed: current + Math.max(0, toAdd) <= limit, limit, current };
    }
    /**
     * Check per-project document quota according to promoteur plan
     */
    static async checkProjectDocumentLimit(promoteurId, projectId, toAdd = 1) {
        const plan = await this.getPromoteurPlan(promoteurId);
        if (!plan)
            return { allowed: false, limit: 0, current: 0 };
        const limit = planLimits_1.PLAN_LIMITS[plan].maxDocuments;
        if (limit === -1)
            return { allowed: true, limit, current: 0 };
        const current = await Document_1.default.countDocuments({ project: projectId });
        return {
            allowed: current + Math.max(0, toAdd) <= limit,
            limit,
            current,
        };
    }
}
exports.PlanLimitService = PlanLimitService;
