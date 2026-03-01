"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLeadService = void 0;
const Lead_1 = __importDefault(require("../models/Lead"));
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const RealChatService_1 = require("./RealChatService");
const mongoose_1 = __importDefault(require("mongoose"));
class RequestLeadService {
    /**
     * Create or update a lead from any request type and optionally create a conversation
     * Unified service for brochures, appointments, document access, contact forms, etc.
     */
    static async createLeadFromRequest(data) {
        // Map request types to lead sources
        const sourceMap = {
            'brochure': 'brochure-request',
            'appointment': 'appointment-request',
            'document-access': 'document-access-request',
            'contact-form': 'contact-form',
            'other': 'other',
        };
        const source = sourceMap[data.requestType] || 'other';
        // Check if lead already exists
        let lead = await Lead_1.default.findOne({
            project: data.projectId,
            email: data.email,
        });
        if (lead) {
            // Lead already exists, just return it
            console.log('[RequestLeadService] Lead already exists:', lead._id);
            return { lead, isNew: false, conversation: null };
        }
        // Create new lead with tags initialized
        lead = new Lead_1.default({
            project: data.projectId,
            promoteur: data.promoteurId,
            client: data.clientId || undefined,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone || '',
            status: 'nouveau',
            source,
            score: data.requestType === 'document-access' ? 'B' : 'C',
            scoreDetails: {
                budgetMatch: data.requestType === 'document-access' ? 50 : 50,
                timelineMatch: data.requestType === 'document-access' ? 50 : 50,
                engagementLevel: data.requestType === 'document-access' ? 60 : 30,
                profileCompleteness: data.requestType === 'document-access' ? 40 : 50,
            },
            tags: ['not-contacted'], // Initialize tags explicitly
            initialMessage: data.initialMessage || `Demande de ${data.requestType}`,
            contactMethod: data.phone ? 'phone' : 'email',
            isSerious: true,
            responseSLA: true,
            pipeline: data.clientId ? [{
                    status: 'nouveau',
                    changedAt: new Date(),
                    changedBy: new mongoose_1.default.Types.ObjectId(data.clientId),
                    notes: `Lead créé via ${data.requestType}`,
                }] : [],
            notes: [],
            documentsSent: [],
            flaggedAsNotSerious: false,
            converted: false,
        });
        await lead.save();
        console.log(`[RequestLeadService] New lead created from ${data.requestType}:`, lead._id);
        // Create conversation if client is authenticated
        let conversation = null;
        if (data.clientId) {
            try {
                conversation = await this.createConversation(data.promoteurId, data.clientId, data.requestType, data.initialMessage);
            }
            catch (convErr) {
                console.warn('[RequestLeadService] Error creating conversation:', convErr.message);
                // Don't fail the entire operation if conversation creation fails
            }
        }
        // Update project stats
        await Project_1.default.findByIdAndUpdate(data.projectId, {
            $inc: { totalLeads: 1 },
        });
        // Update promoteur stats
        await Promoteur_1.default.findByIdAndUpdate(data.promoteurId, {
            $inc: { totalLeadsReceived: 1 },
        });
        return { lead, isNew: true, conversation };
    }
    /**
     * Create conversation between client and promoteur
     */
    static async createConversation(promoteurId, clientId, requestType, message) {
        try {
            const promoteurDoc = await Promoteur_1.default.findById(promoteurId).populate('user');
            const promoteurUserId = promoteurDoc?.user?._id?.toString();
            const participants = [
                { user: clientId, role: 'client' },
                { user: promoteurUserId || promoteurId, role: 'promoteur' },
            ];
            const conversation = await RealChatService_1.RealChatService.createConversation(participants);
            // Add initial message
            const messageText = message || `Demande de ${requestType}`;
            await RealChatService_1.RealChatService.addMessage(conversation._id.toString(), clientId, messageText, 'text');
            console.log('[RequestLeadService] Conversation created:', {
                conversationId: conversation._id?.toString(),
                promoteurId,
                clientId,
                requestType,
            });
            return conversation;
        }
        catch (err) {
            console.error('[RequestLeadService] Error creating conversation:', err.message);
            throw err;
        }
    }
    /**
     * Get lead by project and email (for checking if lead already exists)
     */
    static async getLeadByProjectAndEmail(projectId, email) {
        return Lead_1.default.findOne({
            project: projectId,
            email,
        });
    }
    /**
     * Update lead with request metadata
     */
    static async updateLeadWithRequest(leadId, requestType, metadata) {
        return Lead_1.default.findByIdAndUpdate(leadId, {
            $push: {
                notes: {
                    content: `Demande ${requestType} reçue`,
                    addedAt: new Date(),
                    isPrivate: false,
                    ...metadata,
                },
            },
        }, { new: true });
    }
}
exports.RequestLeadService = RequestLeadService;
