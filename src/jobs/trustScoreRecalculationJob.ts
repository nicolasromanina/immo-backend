import cron from 'node-cron';
import { AdvancedTrustScoreService } from '../services/AdvancedTrustScoreService';

export const startTrustScoreRecalculationJob = () => {
  if (process.env.TRUST_SCORE_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.TRUST_SCORE_CRON || '0 2 * * *';

  cron.schedule(schedule, async () => {
    try {
      console.log('[Job] Trust score recalculation running...');
      const updated = await AdvancedTrustScoreService.recalculateAllScores();
      console.log(`[Job] Trust scores recalculated: ${updated} promoteurs`);
    } catch (error) {
      console.error('Trust score recalculation job failed:', error);
    }
  });
};
