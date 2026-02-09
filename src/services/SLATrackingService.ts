import Lead from '../models/Lead';
import Promoteur from '../models/Promoteur';
import { BadgeService } from './BadgeService';
import { NotificationService } from './NotificationService';

/**
 * Service for tracking SLA (Service Level Agreement) compliance
 * Monitors response times and triggers badges/penalties
 */
export class SLATrackingService {
  /**
   * Calculate response time for a lead
   */
  static calculateResponseTime(leadCreatedAt: Date, firstResponseAt: Date): number {
    const diffMs = firstResponseAt.getTime() - leadCreatedAt.getTime();
    return diffMs / (1000 * 60 * 60); // Convert to hours
  }

  /**
   * Update promoteur average response time
   */
  static async updatePromoteurAverageResponseTime(promoteurId: string) {
    const leads = await Lead.find({
      promoteur: promoteurId,
      lastContactDate: { $exists: true },
      responseTime: { $exists: true },
    }).limit(50); // Last 50 leads

    if (leads.length === 0) return null;

    const totalResponseTime = leads.reduce((sum, lead) => sum + (lead.responseTime || 0), 0);
    const averageResponseTime = totalResponseTime / leads.length;

    await Promoteur.findByIdAndUpdate(promoteurId, {
      averageResponseTime: Number(averageResponseTime.toFixed(2)),
    });

    return averageResponseTime;
  }

  /**
   * Check SLA compliance for a lead
   */
  static checkSLACompliance(responseTimeHours: number): {
    compliant: boolean;
    level: 'excellent' | 'good' | 'acceptable' | 'poor' | 'breach';
    slaHours: number;
  } {
    const SLA_TARGETS = {
      excellent: 2,   // < 2 hours
      good: 6,        // < 6 hours
      acceptable: 24, // < 24 hours
      poor: 48,       // < 48 hours
      breach: 48,     // > 48 hours
    };

    let level: 'excellent' | 'good' | 'acceptable' | 'poor' | 'breach';
    let compliant = true;

    if (responseTimeHours <= SLA_TARGETS.excellent) {
      level = 'excellent';
    } else if (responseTimeHours <= SLA_TARGETS.good) {
      level = 'good';
    } else if (responseTimeHours <= SLA_TARGETS.acceptable) {
      level = 'acceptable';
    } else if (responseTimeHours <= SLA_TARGETS.poor) {
      level = 'poor';
    } else {
      level = 'breach';
      compliant = false;
    }

    return {
      compliant,
      level,
      slaHours: SLA_TARGETS.acceptable, // Standard SLA is 24h
    };
  }

  /**
   * Monitor and update SLA for all recent leads
   */
  static async monitorRecentLeads(hoursBack: number = 72) {
    const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    const leads = await Lead.find({
      createdAt: { $gte: cutoffDate },
      lastContactDate: { $exists: true },
      responseTime: { $exists: false },
    });

    const updates: any[] = [];

    for (const lead of leads) {
      const responseTime = this.calculateResponseTime(lead.createdAt, lead.lastContactDate!);
      const slaCheck = this.checkSLACompliance(responseTime);

      updates.push({
        leadId: lead._id,
        responseTime,
        slaCheck,
      });

      // Update lead
      lead.responseTime = responseTime;
      lead.responseSLA = slaCheck.compliant;
      await lead.save();
    }

    return updates;
  }

  /**
   * Award or remove badges based on SLA performance
   */
  static async updateBadgesBasedOnSLA(promoteurId: string) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return;

    const averageResponseTime = await this.updatePromoteurAverageResponseTime(promoteurId);
    
    if (averageResponseTime === null) return;

    // Check for "Réponse Rapide" badge
    if (averageResponseTime <= 6) {
      await BadgeService.checkAndAwardBadges(promoteurId);
    } else {
      // Remove badge if performance declined
      await BadgeService.removeBadgeIfExists(promoteurId, 'reponse-rapide');
    }

    // Notification if SLA is poor
    if (averageResponseTime > 24) {
      await NotificationService.createNotification({
        user: promoteur.user,
        type: 'warning',
        title: 'Temps de réponse aux leads',
        message: `Votre temps de réponse moyen est de ${averageResponseTime.toFixed(1)}h. Améliorez votre réactivité pour obtenir plus de leads.`,
        priority: 'medium',
      });
    }
  }

  /**
   * Get SLA dashboard metrics for a promoteur
   */
  static async getSLADashboard(promoteurId: string) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return null;

    // Get leads from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const leads = await Lead.find({
      promoteur: promoteurId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    const totalLeads = leads.length;
    const respondedLeads = leads.filter(l => l.lastContactDate).length;
    const slaCompliant = leads.filter(l => l.responseSLA === true).length;
    const slaBreached = leads.filter(l => l.responseSLA === false).length;

    const responseRate = totalLeads > 0 ? (respondedLeads / totalLeads) * 100 : 0;
    const slaComplianceRate = respondedLeads > 0 ? (slaCompliant / respondedLeads) * 100 : 0;

    return {
      averageResponseTime: promoteur.averageResponseTime || 0,
      last30Days: {
        totalLeads,
        respondedLeads,
        responseRate: Number(responseRate.toFixed(1)),
        slaCompliant,
        slaBreached,
        slaComplianceRate: Number(slaComplianceRate.toFixed(1)),
      },
      performance: this.getPerformanceLevel(promoteur.averageResponseTime || 0),
    };
  }

  /**
   * Get performance level based on average response time
   */
  private static getPerformanceLevel(avgResponseTime: number): {
    level: string;
    color: string;
    suggestion: string;
  } {
    if (avgResponseTime <= 2) {
      return {
        level: 'Excellent',
        color: 'green',
        suggestion: 'Continuez ainsi ! Votre réactivité est exceptionnelle.',
      };
    } else if (avgResponseTime <= 6) {
      return {
        level: 'Très bon',
        color: 'blue',
        suggestion: 'Très bonne performance. Maintenez ce rythme.',
      };
    } else if (avgResponseTime <= 24) {
      return {
        level: 'Bon',
        color: 'yellow',
        suggestion: 'Performance acceptable. Essayez de répondre plus rapidement.',
      };
    } else if (avgResponseTime <= 48) {
      return {
        level: 'À améliorer',
        color: 'orange',
        suggestion: 'Votre temps de réponse est trop long. Risque de perdre des leads.',
      };
    } else {
      return {
        level: 'Critique',
        color: 'red',
        suggestion: 'URGENT: Améliorez votre réactivité immédiatement.',
      };
    }
  }
}
