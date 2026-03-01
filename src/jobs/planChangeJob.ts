import cron from 'node-cron';
import Promoteur from '../models/Promoteur';
import Project from '../models/Project';
import { AuditLogService } from '../services/AuditLogService';
import { NotificationService } from '../services/NotificationService';

export const startPlanChangeJob = () => {
  if (process.env.PLAN_CHANGE_JOB_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.PLAN_CHANGE_JOB_SCHEDULE || '0 2 * * *'; // Daily at 2 AM

  cron.schedule(schedule, async () => {
    try {
      console.log('Running plan change job...');

      const now = new Date();

      // Find promoteurs with approved plan changes that are due
      const dueChanges = await Promoteur.find({
        'planChangeRequest.status': 'approved',
        'planChangeRequest.effectiveDate': { $lte: now }
      });

      for (const promoteur of dueChanges) {
        const { requestedPlan, requestType } = promoteur.planChangeRequest!;

        try {
          if (requestType === 'cancel') {
            // Update promoteur subscription
            // Note: Projects are left in their current status
            promoteur.plan = 'starter';
            promoteur.subscriptionStatus = 'expired';
            promoteur.subscriptionEndDate = now;

            await AuditLogService.log({
              actor: 'system',
              actorRole: 'system',
              action: 'apply_plan_cancel',
              category: 'promoteur',
              description: `Applied scheduled plan cancellation for promoteur ${promoteur._id}`,
              targetType: 'Promoteur',
              targetId: promoteur._id.toString()
            });

          } else if (requestType === 'downgrade') {
            // Apply downgrade
            promoteur.plan = requestedPlan as 'starter' | 'publie' | 'verifie' | 'partenaire' | 'enterprise';

            await AuditLogService.log({
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
          await NotificationService.createNotification({
            user: promoteur.user,
            type: 'plan_change_applied',
            title: 'Changement de plan appliqué',
            message: `Votre plan a été ${requestType === 'cancel' ? 'résilié' : `changé vers ${requestedPlan}`}`,
            priority: 'medium'
          });

        } catch (error) {
          console.error(`Error applying plan change for promoteur ${promoteur._id}:`, error);

          await AuditLogService.log({
            actor: 'system',
            actorRole: 'system',
            action: 'plan_change_error',
            category: 'promoteur',
            description: `Error applying plan change for promoteur ${promoteur._id}: ${(error as Error).message}`,
            targetType: 'Promoteur',
            targetId: promoteur._id.toString()
          });
        }
      }

      console.log(`Processed ${dueChanges.length} plan changes`);
    } catch (error) {
      console.error('Error in plan change job:', error);
    }
  });
};