import { PLAN_LIMITS, PLAN_CAPABILITIES, PLAN_HIERARCHY, PlanCapability, PlanType, normalizePlan } from '../config/planLimits';
import Promoteur from '../models/Promoteur';
import Project from '../models/Project';
import Document from '../models/Document';
import Update from '../models/Update';

export class PlanLimitService {
  private static async getPromoteurPlan(promoteurId: string): Promise<PlanType | null> {
    const promoteur = await Promoteur.findById(promoteurId).select('plan');
    if (!promoteur) return null;
    return normalizePlan(promoteur.plan as string);
  }

  /**
   * Check if a promoteur can create a new project
   */
  static async checkProjectLimit(promoteurId: string): Promise<boolean> {
    const promoteur = await Promoteur.findById(promoteurId).select('plan totalProjects');
    if (!promoteur) return false;

    const plan = normalizePlan(promoteur.plan as string);
    const limits = PLAN_LIMITS[plan];
    if (limits.maxProjects === -1) return true; // unlimited

    return promoteur.totalProjects < limits.maxProjects;
  }

  /**
   * Check if a promoteur can add a new team member
   */
  static async checkTeamMemberLimit(promoteurId: string): Promise<boolean> {
    const promoteur = await Promoteur.findById(promoteurId).select('plan teamMembers');
    if (!promoteur) return false;

    const plan = normalizePlan(promoteur.plan as string);
    const limits = PLAN_LIMITS[plan];
    if (limits.maxTeamMembers === -1) return true; // unlimited

    return promoteur.teamMembers.length < limits.maxTeamMembers;
  }

  /**
   * Check if a promoteur can have more active projects
   */
  static async checkActiveProjectLimit(promoteurId: string): Promise<boolean> {
    const promoteur = await Promoteur.findById(promoteurId).select('plan activeProjects');
    if (!promoteur) return false;

    const plan = normalizePlan(promoteur.plan as string);
    const limits = PLAN_LIMITS[plan];
    if (limits.maxActiveProjects === -1) return true; // unlimited

    return promoteur.activeProjects < limits.maxActiveProjects;
  }

  /**
   * Check if a promoteur can upload more media for a project
   */
  static async checkMediaLimit(promoteurId: string, currentMediaCount: number): Promise<boolean> {
    const promoteur = await Promoteur.findById(promoteurId).select('plan');
    if (!promoteur) return false;

    const plan = normalizePlan(promoteur.plan as string);
    const limits = PLAN_LIMITS[plan];
    if (limits.maxMediaPerProject === -1) return true; // unlimited

    return currentMediaCount < limits.maxMediaPerProject;
  }

  /**
   * Check if a promoteur can upload more documents for a project
   */
  static async checkDocumentLimit(promoteurId: string, currentDocCount: number): Promise<boolean> {
    const promoteur = await Promoteur.findById(promoteurId).select('plan');
    if (!promoteur) return false;

    const plan = normalizePlan(promoteur.plan as string);
    const limits = PLAN_LIMITS[plan];
    if (limits.maxDocuments === -1) return true; // unlimited

    return currentDocCount < limits.maxDocuments;
  }

  /**
   * Get current limits info for a promoteur
   */
  static async getLimitsInfo(promoteurId: string): Promise<{
    plan: PlanType;
    limits: typeof PLAN_LIMITS[PlanType];
    capabilities: typeof PLAN_CAPABILITIES[PlanType];
    currentProjects: number;
    currentActiveProjects: number;
    currentTeamMembers: number;
    canCreateProject: boolean;
    canAddTeamMember: boolean;
  }> {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) throw new Error('Promoteur not found');

    const plan = normalizePlan(promoteur.plan as string);
    const limits = PLAN_LIMITS[plan];
    const capabilities = PLAN_CAPABILITIES[plan];

    // Count active projects (not archived or suspended)
    const activeProjectsCount = await Project.countDocuments({
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
  static async validatePlanChange(promoteurId: string, targetPlan: PlanType | null): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    if (!targetPlan) return { valid: true }; // cancel is always allowed

    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return { valid: false, reason: 'Promoteur not found' };

    const targetLimits = PLAN_LIMITS[targetPlan];

    // Check if current usage exceeds target plan limits
    if (targetLimits.maxProjects !== -1 && promoteur.totalProjects > targetLimits.maxProjects) {
      return { valid: false, reason: `Current project count (${promoteur.totalProjects}) exceeds target plan limit (${targetLimits.maxProjects})` };
    }

    if (targetLimits.maxTeamMembers !== -1 && promoteur.teamMembers.length > targetLimits.maxTeamMembers) {
      return { valid: false, reason: `Current team members (${promoteur.teamMembers.length}) exceed target plan limit (${targetLimits.maxTeamMembers})` };
    }

    // Check active projects
    const activeProjectsCount = await Project.countDocuments({
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
  static isUpgrade(currentPlan: PlanType, targetPlan: PlanType): boolean {
    return PLAN_HIERARCHY[targetPlan] > PLAN_HIERARCHY[currentPlan];
  }

  /**
   * Check if target plan is a downgrade from current plan using PLAN_HIERARCHY
   */
  static isDowngrade(currentPlan: PlanType, targetPlan: PlanType): boolean {
    return PLAN_HIERARCHY[targetPlan] < PLAN_HIERARCHY[currentPlan];
  }

  /**
   * Check if a capability is available for a promoteur plan
   */
  static async checkCapability(promoteurId: string, capability: PlanCapability): Promise<boolean> {
    const plan = await this.getPromoteurPlan(promoteurId);
    if (!plan) return false;
    return PLAN_CAPABILITIES[plan][capability];
  }

  /**
   * Check monthly updates quota for a promoteur (current month)
   */
  static async checkMonthlyUpdateLimit(promoteurId: string, toAdd: number = 1): Promise<{
    allowed: boolean;
    limit: number;
    current: number;
  }> {
    const plan = await this.getPromoteurPlan(promoteurId);
    if (!plan) return { allowed: false, limit: 0, current: 0 };

    const limit = PLAN_LIMITS[plan].maxUpdatesPerMonth;
    if (limit === -1) return { allowed: true, limit, current: 0 };

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const current = await Update.countDocuments({
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
  static async checkProjectMediaLimit(
    promoteurId: string,
    projectId: string,
    mediaType: 'renderings' | 'photos' | 'videos' | 'floorPlans',
    toAdd: number = 1
  ): Promise<{ allowed: boolean; limit: number; current: number }> {
    const plan = await this.getPromoteurPlan(promoteurId);
    if (!plan) return { allowed: false, limit: 0, current: 0 };

    const project = await Project.findById(projectId).select('media');
    if (!project) return { allowed: false, limit: 0, current: 0 };

    const limits = PLAN_LIMITS[plan];
    const media = project.media || ({} as any);

    if (mediaType === 'videos') {
      const limit = limits.maxVideos;
      const current = Array.isArray(media.videos) ? media.videos.length : 0;
      if (limit === -1) return { allowed: true, limit, current };
      return { allowed: current + Math.max(0, toAdd) <= limit, limit, current };
    }

    const limit = limits.maxMediaPerProject;
    const current =
      (Array.isArray(media.renderings) ? media.renderings.length : 0) +
      (Array.isArray(media.photos) ? media.photos.length : 0) +
      (Array.isArray(media.floorPlans) ? media.floorPlans.length : 0);

    if (limit === -1) return { allowed: true, limit, current };
    return { allowed: current + Math.max(0, toAdd) <= limit, limit, current };
  }

  /**
   * Check per-project document quota according to promoteur plan
   */
  static async checkProjectDocumentLimit(
    promoteurId: string,
    projectId: string,
    toAdd: number = 1
  ): Promise<{ allowed: boolean; limit: number; current: number }> {
    const plan = await this.getPromoteurPlan(promoteurId);
    if (!plan) return { allowed: false, limit: 0, current: 0 };

    const limit = PLAN_LIMITS[plan].maxDocuments;
    if (limit === -1) return { allowed: true, limit, current: 0 };

    const current = await Document.countDocuments({ project: projectId });
    return {
      allowed: current + Math.max(0, toAdd) <= limit,
      limit,
      current,
    };
  }
}
