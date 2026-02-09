import cron from 'node-cron';
import { SLATrackingService } from '../services/SLATrackingService';
import Promoteur from '../models/Promoteur';

export const startSLAMonitoringJob = () => {
  if (process.env.SLA_MONITORING_CRON_ENABLED === 'false') {
    return;
  }

  // Run every 2 hours
  const schedule = process.env.SLA_MONITORING_CRON || '0 */2 * * *';

  cron.schedule(schedule, async () => {
    try {
      console.log('[Job] SLA monitoring running...');

      // Monitor recent leads and calculate response times
      const updates = await SLATrackingService.monitorRecentLeads(72);
      console.log(`[Job] SLA monitored: ${updates.length} leads updated`);

      // Update badges for all active promoteurs with leads
      const promoteurs = await Promoteur.find({
        subscriptionStatus: { $in: ['active', 'trial'] },
        totalLeadsReceived: { $gt: 0 },
      }).select('_id');

      let badgesUpdated = 0;
      for (const promoteur of promoteurs) {
        try {
          await SLATrackingService.updateBadgesBasedOnSLA(promoteur._id.toString());
          badgesUpdated++;
        } catch (err) {
          console.error(`[Job] SLA badge update failed for ${promoteur._id}:`, err);
        }
      }
      console.log(`[Job] SLA badges evaluated: ${badgesUpdated} promoteurs`);
    } catch (error) {
      console.error('SLA monitoring job failed:', error);
    }
  });
};
