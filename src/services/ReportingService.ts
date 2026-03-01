import Promoteur from '../models/Promoteur';
import Project from '../models/Project';
import Lead from '../models/Lead';
import Update from '../models/Update';
import User from '../models/User';
import Case from '../models/Case';
import Appeal from '../models/Appeal';

/**
 * Service for generating reports and analytics
 */
export class ReportingService {
  /**
   * Generate monthly platform report
   */
  static async generateMonthlyReport(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const report = {
      period: { year, month, startDate, endDate },
      users: await this.getUserStats(startDate, endDate),
      promoteurs: await this.getPromoteurStats(startDate, endDate),
      projects: await this.getProjectStats(startDate, endDate),
      leads: await this.getLeadStats(startDate, endDate),
      trustSafety: await this.getTrustSafetyStats(startDate, endDate),
      engagement: await this.getEngagementStats(startDate, endDate),
    };

    return report;
  }

  /**
   * User statistics
   */
  private static async getUserStats(startDate: Date, endDate: Date) {
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalUsers = await User.countDocuments();

    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: startDate, $lte: endDate },
    });

    const byRole = await User.aggregate([
      { $unwind: '$roles' },
      { $group: { _id: '$roles', count: { $sum: 1 } } },
    ]);

    return {
      total: totalUsers,
      new: newUsers,
      active: activeUsers,
      byRole,
    };
  }

  /**
   * Promoteur statistics
   */
  private static async getPromoteurStats(startDate: Date, endDate: Date) {
    const newPromoteurs = await Promoteur.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalPromoteurs = await Promoteur.countDocuments();

    const byPlan = await Promoteur.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    const byKYCStatus = await Promoteur.aggregate([
      { $group: { _id: '$kycStatus', count: { $sum: 1 } } },
    ]);

    const avgTrustScore = await Promoteur.aggregate([
      { $group: { _id: null, avg: { $avg: '$trustScore' } } },
    ]);

    const onboardingCompletion = await Promoteur.countDocuments({
      onboardingCompleted: true,
    });

    return {
      total: totalPromoteurs,
      new: newPromoteurs,
      byPlan,
      byKYCStatus,
      avgTrustScore: avgTrustScore[0]?.avg || 0,
      onboardingCompletionRate: totalPromoteurs > 0 
        ? ((onboardingCompletion / totalPromoteurs) * 100).toFixed(1)
        : '0',
    };
  }

  /**
   * Project statistics
   */
  private static async getProjectStats(startDate: Date, endDate: Date) {
    const newProjects = await Project.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalProjects = await Project.countDocuments();

    const byStatus = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byPublicationStatus = await Project.aggregate([
      { $group: { _id: '$publicationStatus', count: { $sum: 1 } } },
    ]);

    const avgTrustScore = await Project.aggregate([
      { $match: { publicationStatus: 'published' } },
      { $group: { _id: null, avg: { $avg: '$trustScore' } } },
    ]);

    const updateStats = await Update.aggregate([
      { 
        $match: { 
          publishedAt: { $gte: startDate, $lte: endDate },
          status: 'published'
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: 1 }
        } 
      },
    ]);

    return {
      total: totalProjects,
      new: newProjects,
      byStatus,
      byPublicationStatus,
      avgTrustScore: avgTrustScore[0]?.avg || 0,
      updatesPublished: updateStats[0]?.total || 0,
    };
  }

  /**
   * Lead statistics
   */
  private static async getLeadStats(startDate: Date, endDate: Date) {
    const newLeads = await Lead.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const byScore = await Lead.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$score', count: { $sum: 1 } } },
    ]);

    const byStatus = await Lead.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const converted = await Lead.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      converted: true,
    });

    const conversionRate = newLeads > 0 
      ? ((converted / newLeads) * 100).toFixed(1)
      : '0';

    const avgResponseTime = await Lead.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          responseTime: { $exists: true }
        } 
      },
      { $group: { _id: null, avg: { $avg: '$responseTime' } } },
    ]);

    return {
      total: newLeads,
      byScore,
      byStatus,
      converted,
      conversionRate,
      avgResponseTime: avgResponseTime[0]?.avg || 0,
    };
  }

  /**
   * Trust & Safety statistics
   */
  private static async getTrustSafetyStats(startDate: Date, endDate: Date) {
    const newCases = await Case.countDocuments({
      reportedAt: { $gte: startDate, $lte: endDate },
    });

    const casesByStatus = await Case.aggregate([
      { $match: { reportedAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const casesByCategory = await Case.aggregate([
      { $match: { reportedAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const appeals = await Appeal.countDocuments({
      submittedAt: { $gte: startDate, $lte: endDate },
    });

    const appealsApproved = await Appeal.countDocuments({
      submittedAt: { $gte: startDate, $lte: endDate },
      status: 'approved',
    });

    const sanctionedPromoteurs = await Promoteur.countDocuments({
      'restrictions.appliedAt': { $gte: startDate, $lte: endDate },
    });

    return {
      newCases,
      casesByStatus,
      casesByCategory,
      appeals,
      appealsApproved,
      appealApprovalRate: appeals > 0 
        ? ((appealsApproved / appeals) * 100).toFixed(1)
        : '0',
      sanctionedPromoteurs,
    };
  }

  /**
   * Engagement statistics
   */
  private static async getEngagementStats(startDate: Date, endDate: Date) {
    // Projects with high engagement
    const highEngagementProjects = await Project.countDocuments({
      views: { $gte: 100 },
      favorites: { $gte: 10 },
    });

    // Average views per project
    const avgViews = await Project.aggregate([
      { $match: { publicationStatus: 'published' } },
      { $group: { _id: null, avg: { $avg: '$views' } } },
    ]);

    // Total favorites
    const totalFavorites = await Project.aggregate([
      { $group: { _id: null, total: { $sum: '$favorites' } } },
    ]);

    return {
      highEngagementProjects,
      avgViewsPerProject: avgViews[0]?.avg || 0,
      totalFavorites: totalFavorites[0]?.total || 0,
    };
  }

  /**
   * Generate promoteur performance report
   */
  static async generatePromoteurReport(promoteurId: string, startDate: Date, endDate: Date) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) throw new Error('Promoteur not found');

    const projects = await Project.find({
      promoteur: promoteurId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const leads = await Lead.find({
      promoteur: promoteurId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const updates = await Update.find({
      promoteur: promoteurId,
      publishedAt: { $gte: startDate, $lte: endDate },
      status: 'published',
    });

    const convertedLeads = leads.filter(l => l.converted).length;
    const conversionRate = leads.length > 0 
      ? ((convertedLeads / leads.length) * 100).toFixed(1)
      : '0';

    return {
      promoteur: {
        name: promoteur.organizationName,
        plan: promoteur.plan,
        trustScore: promoteur.trustScore,
        badges: promoteur.badges,
      },
      period: { startDate, endDate },
      projects: {
        total: projects.length,
        byStatus: this.groupBy(projects, 'status'),
      },
      leads: {
        total: leads.length,
        converted: convertedLeads,
        conversionRate,
        byScore: this.groupBy(leads, 'score'),
        avgResponseTime: promoteur.averageResponseTime,
      },
      updates: {
        total: updates.length,
        frequency: projects.length > 0 
          ? (updates.length / projects.length).toFixed(1)
          : '0',
      },
      engagement: {
        totalViews: projects.reduce((sum, p) => sum + p.views, 0),
        totalFavorites: projects.reduce((sum, p) => sum + p.favorites, 0),
      },
    };
  }

  /**
   * Helper: Group array by field
   */
  private static groupBy(array: any[], field: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const key = item[field] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Generate discipline dashboard (update cadence)
   */
  static async generateDisciplineDashboard() {
    const projects = await Project.find({
      publicationStatus: 'published',
      status: { $in: ['demarrage-chantier', 'fondations', 'gros-oeuvres', 'second-oeuvres'] },
    }).populate('promoteur');

    const dashboard: any[] = [];

    for (const project of projects) {
      const lastUpdate = await Update.findOne({
        project: project._id,
        status: 'published',
      }).sort({ publishedAt: -1 });

      let daysSinceUpdate = 999;
      let status = 'critical';

      if (lastUpdate) {
        daysSinceUpdate = Math.floor(
          (Date.now() - lastUpdate.publishedAt!.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceUpdate <= 30) status = 'good';
        else if (daysSinceUpdate <= 45) status = 'warning';
        else if (daysSinceUpdate <= 60) status = 'alert';
        else status = 'critical';
      }

      dashboard.push({
        projectId: project._id,
        projectName: project.title,
        promoteur: (project.promoteur as any).organizationName,
        daysSinceUpdate,
        status,
        lastUpdateDate: lastUpdate?.publishedAt,
        totalUpdates: project.totalUpdates,
      });
    }

    // Sort by most critical first
    dashboard.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

    return {
      projects: dashboard,
      summary: {
        good: dashboard.filter(p => p.status === 'good').length,
        warning: dashboard.filter(p => p.status === 'warning').length,
        alert: dashboard.filter(p => p.status === 'alert').length,
        critical: dashboard.filter(p => p.status === 'critical').length,
      },
    };
  }
}
