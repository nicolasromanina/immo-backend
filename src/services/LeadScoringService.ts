import mongoose from 'mongoose';
import Lead from '../models/Lead';
import Project from '../models/Project';
import Promoteur from '../models/Promoteur';
import { RealChatService } from './RealChatService';
import { PlanLimitService } from './PlanLimitService';

export class LeadScoringService {
  /**
   * Calculate lead score (A, B, C, D)
   */
  static calculateScore(params: {
    budget: number;
    projectPriceFrom: number;
    timeframe: string;
    projectDeliveryDate?: Date;
    hasWhatsApp: boolean;
    messageQuality: string;
  }): { 
    score: 'A' | 'B' | 'C' | 'D';
    details: {
      budgetMatch: number;
      timelineMatch: number;
      engagementLevel: number;
      profileCompleteness: number;
    };
  } {
    let budgetMatch = 0;
    let timelineMatch = 0;
    let engagementLevel = 0;
    let profileCompleteness = 0;

    // 1. Budget Match (0-100)
    const budgetRatio = params.budget / params.projectPriceFrom;
    if (budgetRatio >= 1.2) budgetMatch = 100;
    else if (budgetRatio >= 1.0) budgetMatch = 90;
    else if (budgetRatio >= 0.9) budgetMatch = 75;
    else if (budgetRatio >= 0.8) budgetMatch = 60;
    else if (budgetRatio >= 0.7) budgetMatch = 40;
    else budgetMatch = 20;

    // 2. Timeline Match (0-100)
    const timeframeScores: any = {
      'immediate': 100,
      '3-months': 85,
      '6-months': 70,
      '1-year': 50,
      'flexible': 30,
    };
    timelineMatch = timeframeScores[params.timeframe] || 30;

    // If project has delivery date, adjust based on match
    if (params.projectDeliveryDate) {
      const monthsUntilDelivery = Math.floor(
        (params.projectDeliveryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      if (params.timeframe === 'immediate' && monthsUntilDelivery > 12) {
        timelineMatch -= 30; // Penalize if timeline doesn't match
      }
    }

    // 3. Engagement Level (0-100)
    engagementLevel = 50; // Base score
    if (params.hasWhatsApp) engagementLevel += 20;
    if (params.messageQuality === 'detailed') engagementLevel += 30;
    else if (params.messageQuality === 'standard') engagementLevel += 15;

    // 4. Profile Completeness (0-100)
    profileCompleteness = 60; // Base for having required fields
    if (params.hasWhatsApp) profileCompleteness += 20;
    if (params.messageQuality === 'detailed') profileCompleteness += 20;

    // Calculate overall score
    const overallScore = (
      budgetMatch * 0.35 +
      timelineMatch * 0.25 +
      engagementLevel * 0.20 +
      profileCompleteness * 0.20
    );

    let score: 'A' | 'B' | 'C' | 'D';
    if (overallScore >= 80) score = 'A';
    else if (overallScore >= 60) score = 'B';
    else if (overallScore >= 40) score = 'C';
    else score = 'D';

    return {
      score,
      details: {
        budgetMatch: Math.round(budgetMatch),
        timelineMatch: Math.round(timelineMatch),
        engagementLevel: Math.round(engagementLevel),
        profileCompleteness: Math.round(profileCompleteness),
      },
    };
  }

  /**
   * Create a qualified lead
   */
  static async createLead(params: {
    projectId: string;
    promoteurId: string;
    clientId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    whatsapp?: string;
    budget: number;
    financingType?: 'cash' | 'mortgage' | 'mixed' | 'unknown';
    timeframe: 'immediate' | '3-months' | '6-months' | '1-year' | 'flexible';
    interestedTypology?: string;
    initialMessage: string;
    contactMethod: 'email' | 'whatsapp' | 'phone' | 'rdv';
    source?: string;
  }) {
    // Get project for scoring
    const project = await Project.findById(params.projectId);
    if (!project) throw new Error('Project not found');

    // Calculate message quality
    const normalizedMessage = (params.initialMessage || '').trim();
    let messageQuality = 'short';
    if (normalizedMessage.length > 200) messageQuality = 'detailed';
    else if (normalizedMessage.length > 50) messageQuality = 'standard';

    // Calculate score
    const scoring = this.calculateScore({
      budget: params.budget,
      projectPriceFrom: project.priceFrom,
      timeframe: params.timeframe,
      projectDeliveryDate: project.timeline.deliveryDate,
      hasWhatsApp: !!params.whatsapp,
      messageQuality,
    });

    const canUseLeadScoring = await PlanLimitService.checkCapability(params.promoteurId, 'leadScoring');
    const effectiveScore = canUseLeadScoring ? scoring.score : 'C';

    const lead = new Lead({
      project: params.projectId,
      promoteur: params.promoteurId,
      client: params.clientId,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      whatsapp: params.whatsapp,
      budget: params.budget,
      financingType: params.financingType || 'unknown',
      timeframe: params.timeframe,
      interestedTypology: params.interestedTypology,
      score: effectiveScore,
      scoreDetails: scoring.details,
      status: 'nouveau',
      pipeline: [{
        status: 'nouveau',
        changedAt: new Date(),
        changedBy: params.promoteurId,
      }],
      contactMethod: params.contactMethod,
      initialMessage: normalizedMessage || 'Demande de contact',
      source: params.source || 'contact-form',
      tags: ['not-contacted'], // Initialize tags explicitly
      isSerious: true,
      responseSLA: true,
    });

    await lead.save();

    // Create conversation between client and promoteur for ALL authenticated client requests
    // This includes: document access, brochure, appointments, contact forms, etc.
    if (params.clientId) {
        try {
            const promoteurDoc = await Promoteur.findById(params.promoteurId).populate('user');
            const promoteurUserId = (promoteurDoc?.user as any)?._id?.toString();

            const participants = [
              { user: params.clientId, role: 'client' },
              { user: promoteurUserId || params.promoteurId, role: 'promoteur' },
            ];

            const conversation = await RealChatService.createConversation(participants);

            // Log for debugging: created conversation and resolved promoteur user id
            console.info('[LeadScoring] Created conversation for lead', {
              conversationId: conversation._id?.toString(),
              promoteurId: params.promoteurId,
              promoteurUserId,
              clientId: params.clientId,
              source: params.source,
            });

            // Add initial message from client
            await RealChatService.addMessage(
              conversation._id.toString(),
              params.clientId,
              params.initialMessage,
              'text'
            );
        } catch (err: any) {
            console.warn('[LeadScoring] Error creating conversation:', err.message);
            // Don't fail lead creation if conversation fails
        }
    }

    // Update project stats
    await Project.findByIdAndUpdate(params.projectId, {
      $inc: { totalLeads: 1 },
    });

    return lead;
  }

  /**
   * Update lead status
   */
  static async updateLeadStatus(
    leadId: string,
    newStatus: string,
    userId: string,
    notes?: string
  ) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    const canUsePipeline = await PlanLimitService.checkCapability(lead.promoteur.toString(), 'leadPipeline');
    if (!canUsePipeline && !['nouveau', 'contacte'].includes(newStatus)) {
      throw new Error('Lead pipeline is not available on this plan');
    }

    lead.status = newStatus as any;
    lead.pipeline.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy: new mongoose.Types.ObjectId(userId),
      notes,
    });

    if (newStatus === 'gagne') {
      lead.converted = true;
      lead.conversionDate = new Date();
    }

    await lead.save();
    return lead;
  }

  /**
   * Calculate response time and update SLA
   */
  static async recordResponse(leadId: string) {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    const responseTime = (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60); // hours
    const responseSLA = responseTime <= 24; // SLA is 24 hours

    // Use findByIdAndUpdate for atomic operation to avoid conflicts with concurrent updates
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      {
        responseTime: responseTime,
        responseSLA: responseSLA,
        lastContactDate: new Date(),
      },
      { new: true }
    );

    return updatedLead;
  }
}
