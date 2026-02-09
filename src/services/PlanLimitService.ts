import { PLAN_LIMITS, PlanType } from '../config/planLimits';
import Promoteur from '../models/Promoteur';
import Project from '../models/Project';

export class PlanLimitService {
  /**
   * Check if a promoteur can create a new project
   */
  static async checkProjectLimit(promoteurId: string): Promise<boolean> {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return false;

    const limits = PLAN_LIMITS[promoteur.plan as PlanType];
    if (limits.maxProjects === -1) return true; // unlimited

    return promoteur.totalProjects < limits.maxProjects;
  }

  /**
   * Check if a promoteur can add a new team member
   */
  static async checkTeamMemberLimit(promoteurId: string): Promise<boolean> {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return false;

    const limits = PLAN_LIMITS[promoteur.plan as PlanType];
    if (limits.maxTeamMembers === -1) return true; // unlimited

    return promoteur.teamMembers.length < limits.maxTeamMembers;
  }

  /**
   * Check if a promoteur can have more active projects
   */
  static async checkActiveProjectLimit(promoteurId: string): Promise<boolean> {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return false;

    const limits = PLAN_LIMITS[promoteur.plan as PlanType];
    if (limits.maxActiveProjects === -1) return true; // unlimited

    return promoteur.activeProjects < limits.maxActiveProjects;
  }

  /**
   * Get current limits info for a promoteur
   */
  static async getLimitsInfo(promoteurId: string): Promise<{
    plan: PlanType;
    limits: typeof PLAN_LIMITS[PlanType];
    currentProjects: number;
    currentActiveProjects: number;
    currentTeamMembers: number;
    canCreateProject: boolean;
    canAddTeamMember: boolean;
  }> {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) throw new Error('Promoteur not found');

    const limits = PLAN_LIMITS[promoteur.plan as PlanType];

    // Count active projects (not archived or suspended)
    const activeProjectsCount = await Project.countDocuments({
      promoteur: promoteurId,
      status: { $nin: ['archive', 'suspended'] }
    });

    const canCreateProject = limits.maxProjects === -1 || promoteur.totalProjects < limits.maxProjects;
    const canAddTeamMember = limits.maxTeamMembers === -1 || promoteur.teamMembers.length < limits.maxTeamMembers;

    return {
      plan: promoteur.plan as PlanType,
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
  static async validatePlanChange(promoteurId: string, targetPlan: PlanType | null): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    if (!targetPlan) return { valid: true }; // cancel is always allowed

    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return { valid: false, reason: 'Promoteur not found' };

    const currentLimits = PLAN_LIMITS[promoteur.plan as PlanType];
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
} 

