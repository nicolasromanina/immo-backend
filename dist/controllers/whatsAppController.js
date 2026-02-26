"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppController = void 0;
const Lead_1 = __importDefault(require("../models/Lead"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const WhatsAppMessage_1 = __importDefault(require("../models/WhatsAppMessage"));
const WhatsAppService_1 = require("../services/WhatsAppService");
class WhatsAppController {
    /**
     * Send WhatsApp message to a lead using a template
     */
    static async sendToLead(req, res) {
        try {
            const { leadId, templateSlug, data } = req.body;
            const userId = req.user.id;
            const lead = await Lead_1.default.findById(leadId);
            if (!lead) {
                return res.status(404).json({ message: 'Lead not found' });
            }
            const promoteur = await Promoteur_1.default.findById(lead.promoteur);
            if (!promoteur || promoteur.user.toString() !== userId) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            const { PlanLimitService } = await Promise.resolve().then(() => __importStar(require('../services/PlanLimitService')));
            const canUseWhatsAppTemplates = await PlanLimitService.checkCapability(lead.promoteur.toString(), 'whatsAppTemplates');
            if (!canUseWhatsAppTemplates) {
                return res.status(403).json({
                    message: 'Les templates WhatsApp ne sont pas disponibles sur votre plan',
                    upgrade: true,
                });
            }
            if (!lead.whatsapp && !lead.phone) {
                return res.status(400).json({ message: 'Lead has no WhatsApp number' });
            }
            const to = lead.whatsapp || lead.phone;
            const message = await WhatsAppService_1.WhatsAppService.sendTemplateMessage({
                to,
                templateSlug,
                data: data || {},
            });
            const log = await WhatsAppMessage_1.default.create({
                promoteur: lead.promoteur,
                lead: lead._id,
                to,
                templateSlug,
                content: JSON.stringify(message),
                status: 'sent',
                sentAt: new Date(),
            });
            res.json({ message, log });
        }
        catch (error) {
            console.error('Error sending WhatsApp message:', error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
    /**
     * Get WhatsApp messages for a lead
     */
    static async getLeadMessages(req, res) {
        try {
            const { leadId } = req.params;
            const userId = req.user.id;
            const lead = await Lead_1.default.findById(leadId);
            if (!lead) {
                return res.status(404).json({ message: 'Lead not found' });
            }
            const promoteur = await Promoteur_1.default.findById(lead.promoteur);
            if (!promoteur || promoteur.user.toString() !== userId) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            const messages = await WhatsAppMessage_1.default.find({ lead: lead._id })
                .sort({ createdAt: -1 });
            res.json({ messages });
        }
        catch (error) {
            console.error('Error getting WhatsApp messages:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.WhatsAppController = WhatsAppController;
