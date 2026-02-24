"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadFollowUpService = void 0;
const Lead_1 = __importDefault(require("../models/Lead"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const NotificationService_1 = require("./NotificationService");
class LeadFollowUpService {
    static async notifyOverdueFollowUps() {
        const now = new Date();
        const leads = await Lead_1.default.find({
            nextFollowUpDate: { $lte: now },
            status: { $nin: ['gagne', 'perdu'] },
        }).populate('project', 'title');
        let notified = 0;
        for (const lead of leads) {
            const promoteur = await Promoteur_1.default.findById(lead.promoteur);
            if (!promoteur?.user)
                continue;
            await NotificationService_1.NotificationService.create({
                recipient: promoteur.user.toString(),
                type: 'lead',
                title: 'Relance lead en retard',
                message: `Relance a faire pour ${lead.firstName} ${lead.lastName}`,
                relatedLead: lead._id.toString(),
                priority: 'high',
                channels: { inApp: true, email: true },
            });
            notified += 1;
        }
        return notified;
    }
    static async notifyUnansweredNewLeads() {
        const now = new Date();
        const threshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const leads = await Lead_1.default.find({
            status: 'nouveau',
            createdAt: { $lte: threshold },
        }).populate('project', 'title');
        let notified = 0;
        for (const lead of leads) {
            const promoteur = await Promoteur_1.default.findById(lead.promoteur);
            if (!promoteur?.user)
                continue;
            await NotificationService_1.NotificationService.create({
                recipient: promoteur.user.toString(),
                type: 'lead',
                title: 'Lead sans reponse',
                message: `Le lead ${lead.firstName} ${lead.lastName} n'a pas ete traite sous 24h`,
                relatedLead: lead._id.toString(),
                priority: 'urgent',
                channels: { inApp: true, email: true },
            });
            notified += 1;
        }
        return notified;
    }
}
exports.LeadFollowUpService = LeadFollowUpService;
