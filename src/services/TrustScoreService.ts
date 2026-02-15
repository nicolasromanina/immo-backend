import Promoteur from '../models/Promoteur';
import Project from '../models/Project';
import Update from '../models/Update';
import Document from '../models/Document';
import Lead from '../models/Lead';
import Badge from '../models/Badge';
import { trustScoreConfig } from '../config/trustScore';

export class TrustScoreService {
  /**
   * Calculate trust score for a promoteur
   * Score is 0-100 based on multiple factors
   */
  static async calculatePromoteurTrustScore(promoteurId: string): Promise<number> {
    const promoteur = await Promoteur.findById(promoteurId).populate('badges.badgeId');
    if (!promoteur) return 0;

    let score = 0;
    const promoteurWeights = trustScoreConfig.promoteur;
    
    // 1. KYC Verification (20 points)
    if (promoteur.kycStatus === 'verified') {
      score += promoteurWeights.kycVerified;
    } else if (promoteur.kycStatus === 'submitted') {
      score += promoteurWeights.kycSubmitted;
    }
    
    // 2. Onboarding Completion (10 points)
    if (promoteur.onboardingCompleted) {
      score += promoteurWeights.onboarding;
    } else {
      score += (promoteur.onboardingProgress / 100) * promoteurWeights.onboarding;
    }
    
    // 3. Financial Proof (15 points)
    // Only count approved financial documents towards the score
    const approvedFinancialDocs = promoteur.financialProofDocuments?.filter((d: any) => d.status === 'approved') || [];
    const grantedFinancialLevel = approvedFinancialDocs.length > 0 ? promoteur.financialProofLevel : 'none';
    score += promoteurWeights.financial[grantedFinancialLevel] || 0;
    
    // 4. Active Projects & Updates (20 points)
    const projects = await Project.find({ 
      promoteur: promoteurId, 
      publicationStatus: 'published',
      status: { $ne: 'archive' }
    });
    
    if (projects.length > 0) {
      score += Math.min(promoteurWeights.projectsMax, projects.length * 2);
      
      // Check update frequency
      let totalUpdateScore = 0;
      for (const project of projects) {
        const updates = await Update.find({ 
          project: project._id, 
          status: 'published' 
        }).sort({ publishedAt: -1 }).limit(1);
        
        if (updates.length > 0) {
          const lastUpdate = updates[0];
          const daysSinceUpdate = Math.floor(
            (Date.now() - lastUpdate.publishedAt!.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysSinceUpdate <= 30) totalUpdateScore += 2;
          else if (daysSinceUpdate <= 60) totalUpdateScore += 1;
        }
      }
      score += Math.min(promoteurWeights.updatesMax, totalUpdateScore);
    }
    
    // 5. Document Completeness (15 points)
    const documents = await Document.find({ 
      promoteur: promoteurId,
      status: 'fourni',
      visibility: 'public'
    });
    
    const documentScore = Math.min(promoteurWeights.documentsMax, documents.length * 1.5);
    score += documentScore;
    
    // 6. Lead Response Performance (10 points)
    if (promoteur.averageResponseTime) {
      if (promoteur.averageResponseTime <= 2) score += promoteurWeights.responseMax;
      else if (promoteur.averageResponseTime <= 6) score += Math.round(promoteurWeights.responseMax * 0.7);
      else if (promoteur.averageResponseTime <= 24) score += Math.round(promoteurWeights.responseMax * 0.5);
      else if (promoteur.averageResponseTime <= 48) score += Math.round(promoteurWeights.responseMax * 0.2);
    }
    
    // 7. Badges (10 points)
    const badgeBonus = promoteur.badges.reduce((sum, b: any) => {
      return sum + (b.badgeId?.trustScoreBonus || 0);
    }, 0);
    score += Math.min(promoteurWeights.badgesMax, badgeBonus);
    
    // 8. Penalties for restrictions
    if (promoteur.restrictions && promoteur.restrictions.length > 0) {
      const activeRestrictions = promoteur.restrictions.filter(r => 
        !r.expiresAt || r.expiresAt > new Date()
      );
      score -= activeRestrictions.length * promoteurWeights.restrictionPenalty;
    }
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate trust score for a project
   */
  static async calculateProjectTrustScore(projectId: string): Promise<number> {
    const project = await Project.findById(projectId);
    if (!project) return 0;

    let score = 0;
    const projectWeights = trustScoreConfig.project;
    
    // 1. Basic Info Completeness (20 points)
    let completeness = 0;
    if (project.title) completeness += 2;
    if (project.description && project.description.length > 100) completeness += 3;
    if (project.media.coverImage) completeness += 3;
    if (project.media.renderings.length > 0) completeness += 3;
    if (project.media.photos.length > 0) completeness += 3;
    if (project.typologies.length > 0) completeness += 3;
    if (project.timeline.deliveryDate) completeness += 3;
    score += Math.min(projectWeights.infoMax, completeness);
    
    // 2. Update Frequency (30 points)
    const updates = await Update.find({ 
      project: projectId, 
      status: 'published' 
    }).sort({ publishedAt: -1 });
    
    if (updates.length > 0) {
      score += Math.min(10, updates.length * 2);
      
      const lastUpdate = updates[0];
      const daysSinceUpdate = Math.floor(
        (Date.now() - lastUpdate.publishedAt!.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceUpdate <= 14) score += Math.round(projectWeights.updatesMax * 0.66);
      else if (daysSinceUpdate <= 30) score += Math.round(projectWeights.updatesMax * 0.5);
      else if (daysSinceUpdate <= 60) score += Math.round(projectWeights.updatesMax * 0.33);
      else if (daysSinceUpdate <= 90) score += Math.round(projectWeights.updatesMax * 0.16);
    }
    
    // 3. Document Availability (25 points)
    const documents = await Document.find({ 
      project: projectId,
      status: 'fourni'
    });
    
    const publicDocs = documents.filter(d => d.visibility === 'public').length;
    const privateDocs = documents.filter(d => d.visibility === 'private').length;
    
    score += Math.min(Math.round(projectWeights.documentsMax * 0.6), publicDocs * 3);
    score += Math.min(Math.round(projectWeights.documentsMax * 0.4), privateDocs * 2);
    
    // 4. Transparency (15 points)
    if (project.faq.length > 0) score += Math.round(projectWeights.transparencyMax * 0.33);
    if (project.delays.length === 0) score += Math.round(projectWeights.transparencyMax * 0.33);
    else if (project.delays.length > 0 && project.delays[0].mitigationPlan) score += Math.round(projectWeights.transparencyMax * 0.2);
    
    if (project.risks.length === 0) score += Math.round(projectWeights.transparencyMax * 0.33);
    else {
      const resolvedRisks = project.risks.filter(r => r.status === 'resolved').length;
      score += Math.min(Math.round(projectWeights.transparencyMax * 0.33), resolvedRisks * 2);
    }
    
    // 5. Engagement (10 points)
    if (project.totalLeads > 0) {
      score += Math.min(Math.round(projectWeights.engagementMax * 0.5), Math.floor(project.totalLeads / 5));
    }
    if (project.views > 100) {
      score += Math.min(Math.round(projectWeights.engagementMax * 0.5), Math.floor(project.views / 100));
    }
    
    // Penalties
    if (project.changesLog.length > 10) score -= projectWeights.penalties.changesLog;
    if (project.status === 'suspended') score -= projectWeights.penalties.suspended;

    const threshold = project.projectType === 'villa'
      ? projectWeights.typeThresholds.villa
      : projectWeights.typeThresholds.immeuble;

    if (project.media.photos.length < threshold.minPhotos) {
      score -= Math.round(projectWeights.infoMax * 0.2);
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Update trust scores for a promoteur and all their projects
   */
  static async updateAllScores(promoteurId: string) {
    // Update promoteur score
    const promoteurScore = await this.calculatePromoteurTrustScore(promoteurId);
    await Promoteur.findByIdAndUpdate(promoteurId, { trustScore: promoteurScore });
    
    // Update all project scores
    const projects = await Project.find({ promoteur: promoteurId });
    for (const project of projects) {
      const projectScore = await this.calculateProjectTrustScore(project._id.toString());
      await Project.findByIdAndUpdate(project._id, { trustScore: projectScore });
    }
    
    return { promoteurScore, projectsUpdated: projects.length };
  }

  /**
   * Get suggestions for improving trust score
   */
  static async getImprovementSuggestions(promoteurId: string) {
    const promoteur = await Promoteur.findById(promoteurId);
    if (!promoteur) return [];

    const suggestions: Array<{ action: string; points: number; priority: 'high' | 'medium' | 'low' }> = [];

    // Check what's missing
    if (promoteur.kycStatus !== 'verified') {
      suggestions.push({ 
        action: 'Complete KYC verification', 
        points: 20, 
        priority: 'high' 
      });
    }

    if (!promoteur.onboardingCompleted) {
      suggestions.push({ 
        action: 'Complete onboarding checklist', 
        points: 10, 
        priority: 'high' 
      });
    }

    if (promoteur.financialProofLevel === 'none' || promoteur.financialProofLevel === 'basic') {
      suggestions.push({ 
        action: 'Upload stronger financial proof documents', 
        points: 10, 
        priority: 'medium' 
      });
    }

    const projects = await Project.find({ 
      promoteur: promoteurId, 
      publicationStatus: 'published' 
    });

    if (projects.length === 0) {
      suggestions.push({ 
        action: 'Create and publish your first project', 
        points: 15, 
        priority: 'high' 
      });
    }

    for (const project of projects) {
      const updates = await Update.find({ 
        project: project._id, 
        status: 'published' 
      }).sort({ publishedAt: -1 }).limit(1);

      if (updates.length === 0 || 
          (Date.now() - updates[0].publishedAt!.getTime()) > 30 * 24 * 60 * 60 * 1000) {
        suggestions.push({ 
          action: `Post an update for "${project.title}"`, 
          points: 10, 
          priority: 'high' 
        });
      }

      const documents = await Document.find({ 
        project: project._id,
        visibility: 'public' 
      });

      if (documents.length < 5) {
        suggestions.push({ 
          action: `Add more public documents to "${project.title}"`, 
          points: 5, 
          priority: 'medium' 
        });
      }
    }

    if (!promoteur.averageResponseTime || promoteur.averageResponseTime > 6) {
      suggestions.push({ 
        action: 'Respond to leads faster (target: under 6 hours)', 
        points: 10, 
        priority: 'high' 
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}
