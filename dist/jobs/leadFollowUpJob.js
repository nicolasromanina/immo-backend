"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLeadFollowUpJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const LeadFollowUpService_1 = require("../services/LeadFollowUpService");
const AuditLogService_1 = require("../services/AuditLogService");
const startLeadFollowUpJob = () => {
    if (process.env.LEAD_FOLLOWUP_CRON_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.LEAD_FOLLOWUP_CRON || '0 * * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            const overdue = await LeadFollowUpService_1.LeadFollowUpService.notifyOverdueFollowUps();
            const unanswered = await LeadFollowUpService_1.LeadFollowUpService.notifyUnansweredNewLeads();
            if (overdue > 0 || unanswered > 0) {
                await AuditLogService_1.AuditLogService.log({
                    actor: 'system',
                    actorRole: 'system',
                    action: 'lead_followup_reminders',
                    category: 'lead',
                    description: `Sent ${overdue} overdue follow-up(s), ${unanswered} unanswered lead alert(s)`,
                });
            }
        }
        catch (error) {
            console.error('Lead follow-up job failed:', error);
        }
    });
};
exports.startLeadFollowUpJob = startLeadFollowUpJob;
