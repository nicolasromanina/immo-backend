"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadScoringService = void 0;
const Lead_1 = __importDefault(require("../models/Lead"));
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const RealChatService_1 = require("./RealChatService");
class LeadScoringService {
    /**
     * Calculate lead score (A, B, C, D)
     */
    static calculateScore(params) {
        let budgetMatch = 0;
        let timelineMatch = 0;
        let engagementLevel = 0;
        let profileCompleteness = 0;
        // 1. Budget Match (0-100)
        const budgetRatio = params.budget / params.projectPriceFrom;
        if (budgetRatio >= 1.2)
            budgetMatch = 100;
        else if (budgetRatio >= 1.0)
            budgetMatch = 90;
        else if (budgetRatio >= 0.9)
            budgetMatch = 75;
        else if (budgetRatio >= 0.8)
            budgetMatch = 60;
        else if (budgetRatio >= 0.7)
            budgetMatch = 40;
        else
            budgetMatch = 20;
        // 2. Timeline Match (0-100)
        const timeframeScores = {
            'immediate': 100,
            '3-months': 85,
            '6-months': 70,
            '1-year': 50,
            'flexible': 30,
        };
        timelineMatch = timeframeScores[params.timeframe] || 30;
        // If project has delivery date, adjust based on match
        if (params.projectDeliveryDate) {
            const monthsUntilDelivery = Math.floor((params.projectDeliveryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30));
            if (params.timeframe === 'immediate' && monthsUntilDelivery > 12) {
                timelineMatch -= 30; // Penalize if timeline doesn't match
            }
        }
        // 3. Engagement Level (0-100)
        engagementLevel = 50; // Base score
        if (params.hasWhatsApp)
            engagementLevel += 20;
        if (params.messageQuality === 'detailed')
            engagementLevel += 30;
        else if (params.messageQuality === 'standard')
            engagementLevel += 15;
        // 4. Profile Completeness (0-100)
        profileCompleteness = 60; // Base for having required fields
        if (params.hasWhatsApp)
            profileCompleteness += 20;
        if (params.messageQuality === 'detailed')
            profileCompleteness += 20;
        // Calculate overall score
        const overallScore = (budgetMatch * 0.35 +
            timelineMatch * 0.25 +
            engagementLevel * 0.20 +
            profileCompleteness * 0.20);
        let score;
        if (overallScore >= 80)
            score = 'A';
        else if (overallScore >= 60)
            score = 'B';
        else if (overallScore >= 40)
            score = 'C';
        else
            score = 'D';
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
    static async createLead(params) {
        // Get project for scoring
        const project = await Project_1.default.findById(params.projectId);
        if (!project)
            throw new Error('Project not found');
        // Calculate message quality
        const normalizedMessage = (params.initialMessage || '').trim();
        let messageQuality = 'short';
        if (normalizedMessage.length > 200)
            messageQuality = 'detailed';
        else if (normalizedMessage.length > 50)
            messageQuality = 'standard';
        // Calculate score
        const scoring = this.calculateScore({
            budget: params.budget,
            projectPriceFrom: project.priceFrom,
            timeframe: params.timeframe,
            projectDeliveryDate: project.timeline.deliveryDate,
            hasWhatsApp: !!params.whatsapp,
            messageQuality,
        });
        const lead = new Lead_1.default({
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
            score: scoring.score,
            scoreDetails: scoring.details,
            status: 'nouveau',
            pipeline: [{
                    status: 'nouveau',
                    changedAt: new Date(),
                    changedBy: params.promoteurId,
                }],
            contactMethod: params.contactMethod,
            initialMessage: normalizedMessage || 'Demande de contact',
            source: params.source || 'website',
            isSerious: true,
            responseSLA: true,
        });
        await lead.save();
        // Create conversation between client and promoteur (use promoteur's user id)
        if (params.clientId) {
            const promoteurDoc = await Promoteur_1.default.findById(params.promoteurId).populate('user');
            const promoteurUserId = promoteurDoc?.user?._id?.toString();
            const participants = [
                { user: params.clientId, role: 'client' },
                { user: promoteurUserId || params.promoteurId, role: 'promoteur' },
            ];
            const conversation = await RealChatService_1.RealChatService.createConversation(participants);
            // Log for debugging: created conversation and resolved promoteur user id
            console.info('[LeadScoring] Created conversation', {
                conversationId: conversation._id?.toString(),
                promoteurId: params.promoteurId,
                promoteurUserId,
                clientId: params.clientId,
            });
            // Add initial message from client
            await RealChatService_1.RealChatService.addMessage(conversation._id.toString(), params.clientId, params.initialMessage, 'text');
        }
        // Update project stats
        await Project_1.default.findByIdAndUpdate(params.projectId, {
            $inc: { totalLeads: 1 },
        });
        return lead;
    }
    /**
     * Update lead status
     */
    static async updateLeadStatus(leadId, newStatus, userId, notes) {
        const lead = await Lead_1.default.findById(leadId);
        if (!lead)
            throw new Error('Lead not found');
        lead.status = newStatus;
        lead.pipeline.push({
            status: newStatus,
            changedAt: new Date(),
            changedBy: userId,
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
    static async recordResponse(leadId) {
        const lead = await Lead_1.default.findById(leadId);
        if (!lead)
            throw new Error('Lead not found');
        const responseTime = (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60); // hours
        lead.responseTime = responseTime;
        lead.responseSLA = responseTime <= 24; // SLA is 24 hours
        lead.lastContactDate = new Date();
        await lead.save();
        return lead;
    }
}
exports.LeadScoringService = LeadScoringService;
