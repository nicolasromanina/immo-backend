"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrochureService = void 0;
const BrochureRequest_1 = __importDefault(require("../models/BrochureRequest"));
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const Lead_1 = __importDefault(require("../models/Lead"));
const NotificationService_1 = require("./NotificationService");
const WhatsAppService_1 = require("./WhatsAppService");
class BrochureService {
    /**
     * Request a brochure for a project
     */
    static async requestBrochure(data) {
        const project = await Project_1.default.findById(data.projectId);
        if (!project) {
            throw new Error('Project not found');
        }
        const existingRequest = await BrochureRequest_1.default.findOne({
            project: data.projectId,
            email: data.email,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });
        if (existingRequest) {
            throw new Error('Brochure already requested in the last 24 hours');
        }
        const request = new BrochureRequest_1.default({
            project: data.projectId,
            promoteur: project.promoteur,
            client: data.clientId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            source: data.source || 'website',
            status: 'pending',
        });
        await request.save();
        await NotificationService_1.NotificationService.create({
            recipient: project.promoteur.toString(),
            type: 'lead',
            title: 'Demande de brochure',
            message: `${data.firstName} ${data.lastName} demande la brochure pour ${project.title}`,
            priority: 'medium',
            channels: { inApp: true, email: true },
            data: { requestId: request._id, projectId: data.projectId },
        });
        await this.autoSendBrochure(request._id.toString());
        // Best effort: do not fail brochure request if lead creation fails
        try {
            await this.createOrUpdateLead(data, project);
        }
        catch (error) {
            console.error('Lead creation from brochure request failed:', error);
        }
        return request;
    }
    /**
     * Auto-send brochure if available
     */
    static async autoSendBrochure(requestId) {
        const request = await BrochureRequest_1.default.findById(requestId).populate('project');
        if (!request)
            return;
        const project = request.project;
        const hasBrochure = project.media?.renderings?.length > 0;
        if (hasBrochure) {
            const downloadLink = `/api/brochures/${project._id}/download?token=${this.generateToken()}`;
            request.status = 'sent';
            request.sentAt = new Date();
            request.downloadLink = downloadLink;
            await request.save();
            await NotificationService_1.NotificationService.create({
                recipient: request.email,
                type: 'system',
                title: `Brochure - ${project.title}`,
                message: `Voici le lien pour telecharger la brochure: ${downloadLink}`,
                priority: 'medium',
                channels: { email: true },
            });
        }
    }
    /**
     * Generate secure token
     */
    static generateToken() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
    /**
     * Create or update lead from brochure request
     */
    static async createOrUpdateLead(data, project) {
        let actorUserId = data.clientId;
        if (!actorUserId) {
            const promoteur = await Promoteur_1.default.findById(project.promoteur).select('user');
            actorUserId = promoteur?.user?.toString();
        }
        const existingLead = await Lead_1.default.findOne({
            project: project._id,
            email: data.email,
        });
        if (existingLead) {
            return;
        }
        const lead = new Lead_1.default({
            project: project._id,
            promoteur: project.promoteur,
            client: data.clientId || undefined,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone || '',
            budget: 0,
            financingType: 'unknown',
            timeframe: 'flexible',
            contactMethod: 'email',
            status: 'nouveau',
            source: data.source || 'website',
            score: 'C',
            scoreDetails: {
                budgetMatch: 50,
                timelineMatch: 50,
                engagementLevel: 30,
                profileCompleteness: 50,
            },
            initialMessage: 'Demande de brochure',
            notes: actorUserId ? [{
                    content: 'Lead cree via demande de brochure',
                    addedBy: actorUserId,
                    addedAt: new Date(),
                    isPrivate: false,
                }] : [],
            pipeline: actorUserId ? [{
                    status: 'nouveau',
                    changedAt: new Date(),
                    changedBy: actorUserId,
                    notes: 'Demande de brochure',
                }] : [],
        });
        await lead.save();
        await Project_1.default.findByIdAndUpdate(project._id, {
            $inc: { totalLeads: 1 },
        });
        await Promoteur_1.default.findByIdAndUpdate(project.promoteur, {
            $inc: { totalLeadsReceived: 1 },
        });
    }
    /**
     * Track brochure download
     */
    static async trackDownload(requestId) {
        return BrochureRequest_1.default.findByIdAndUpdate(requestId, { downloadedAt: new Date() }, { new: true });
    }
    /**
     * Track email open
     */
    static async trackEmailOpen(requestId) {
        return BrochureRequest_1.default.findByIdAndUpdate(requestId, { emailOpened: true, emailOpenedAt: new Date() }, { new: true });
    }
    /**
     * Send brochure via WhatsApp
     */
    static async sendViaWhatsApp(requestId) {
        const request = await BrochureRequest_1.default.findById(requestId).populate('project');
        if (!request || !request.phone) {
            throw new Error('Request not found or no phone number');
        }
        const project = request.project;
        await WhatsAppService_1.WhatsAppService.sendTemplateMessage({
            to: request.phone,
            templateSlug: 'brochure_delivery',
            data: {
                firstName: request.firstName,
                projectName: project.title,
                downloadLink: request.downloadLink || '',
            },
        });
        request.sentVia = request.sentVia === 'email' ? 'both' : 'whatsapp';
        await request.save();
        return request;
    }
    /**
     * Get brochure requests for a project
     */
    static async getProjectRequests(projectId) {
        return BrochureRequest_1.default.find({ project: projectId }).sort({ createdAt: -1 });
    }
    /**
     * Get brochure requests for a promoteur
     */
    static async getPromoteurRequests(promoteurId, filters) {
        const query = { promoteur: promoteurId };
        if (filters?.status)
            query.status = filters.status;
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters?.startDate)
                query.createdAt.$gte = filters.startDate;
            if (filters?.endDate)
                query.createdAt.$lte = filters.endDate;
        }
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const skip = (page - 1) * limit;
        const requests = await BrochureRequest_1.default.find(query)
            .populate('project', 'title')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await BrochureRequest_1.default.countDocuments(query);
        return {
            requests,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            },
        };
    }
    /**
     * Get brochure stats
     */
    static async getStats(promoteurId) {
        const match = {};
        if (promoteurId)
            match.promoteur = promoteurId;
        const stats = await BrochureRequest_1.default.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
                    downloaded: { $sum: { $cond: [{ $ne: ['$downloadedAt', null] }, 1, 0] } },
                    emailOpened: { $sum: { $cond: ['$emailOpened', 1, 0] } },
                },
            },
        ]);
        if (stats.length === 0) {
            return {
                total: 0,
                sent: 0,
                downloaded: 0,
                emailOpened: 0,
                downloadRate: 0,
                openRate: 0,
            };
        }
        const { total, sent, downloaded, emailOpened } = stats[0];
        return {
            total,
            sent,
            downloaded,
            emailOpened,
            downloadRate: sent > 0 ? Math.round((downloaded / sent) * 100) : 0,
            openRate: sent > 0 ? Math.round((emailOpened / sent) * 100) : 0,
        };
    }
}
exports.BrochureService = BrochureService;
