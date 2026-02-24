"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPlanChangeJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const Project_1 = __importDefault(require("../models/Project"));
const AuditLogService_1 = require("../services/AuditLogService");
const NotificationService_1 = require("../services/NotificationService");
const startPlanChangeJob = () => {
    if (process.env.PLAN_CHANGE_JOB_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.PLAN_CHANGE_JOB_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
    node_cron_1.default.schedule(schedule, async () => {
        try {
            console.log('Running plan change job...');
            const now = new Date();
            // Find promoteurs with approved plan changes that are due
            const dueChanges = await Promoteur_1.default.find({
                'planChangeRequest.status': 'approved',
                'planChangeRequest.effectiveDate': { $lte: now }
            });
            for (const promoteur of dueChanges) {
                const { requestedPlan, requestType } = promoteur.planChangeRequest;
                try {
                    if (requestType === 'cancel') {
                        // Archive all projects
                        await Project_1.default.updateMany({ promoteur: promoteur._id }, { status: 'archive' });
                        // Update promoteur
                        promoteur.plan = 'basique';
                        promoteur.subscriptionStatus = 'expired';
                        promoteur.subscriptionEndDate = now;
                        await AuditLogService_1.AuditLogService.log({
                            actor: 'system',
                            actorRole: 'system',
                            action: 'apply_plan_cancel',
                            category: 'promoteur',
                            description: `Applied scheduled plan cancellation for promoteur ${promoteur._id}`,
                            targetType: 'Promoteur',
                            targetId: promoteur._id.toString()
                        });
                    }
                    else if (requestType === 'downgrade') {
                        // Apply downgrade
                        promoteur.plan = requestedPlan;
                        await AuditLogService_1.AuditLogService.log({
                            actor: 'system',
                            actorRole: 'system',
                            action: 'apply_plan_downgrade',
                            category: 'promoteur',
                            description: `Applied scheduled plan downgrade to ${requestedPlan} for promoteur ${promoteur._id}`,
                            targetType: 'Promoteur',
                            targetId: promoteur._id.toString()
                        });
                    }
                    // Clear the plan change request
                    promoteur.planChangeRequest = undefined;
                    await promoteur.save();
                    // Notify the promoteur
                    await NotificationService_1.NotificationService.createNotification({
                        user: promoteur.user,
                        type: 'plan_change_applied',
                        title: 'Changement de plan appliqué',
                        message: `Votre plan a été ${requestType === 'cancel' ? 'résilié' : `changé vers ${requestedPlan}`}`,
                        priority: 'medium'
                    });
                }
                catch (error) {
                    console.error(`Error applying plan change for promoteur ${promoteur._id}:`, error);
                    await AuditLogService_1.AuditLogService.log({
                        actor: 'system',
                        actorRole: 'system',
                        action: 'plan_change_error',
                        category: 'promoteur',
                        description: `Error applying plan change for promoteur ${promoteur._id}: ${error.message}`,
                        targetType: 'Promoteur',
                        targetId: promoteur._id.toString()
                    });
                }
            }
            console.log(`Processed ${dueChanges.length} plan changes`);
        }
        catch (error) {
            console.error('Error in plan change job:', error);
        }
    });
};
exports.startPlanChangeJob = startPlanChangeJob;
