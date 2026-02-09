import cron from 'node-cron';
import { PriceAnalyticsService } from '../services/PriceAnalyticsService';

export const startPriceRecalculationJob = () => {
  if (process.env.PRICE_RECALCULATION_CRON_ENABLED === 'false') {
    return;
  }

  // Run weekly on Sunday at 4 AM
  const schedule = process.env.PRICE_RECALCULATION_CRON || '0 4 * * 0';

  cron.schedule(schedule, async () => {
    try {
      console.log('[Job] Price stats recalculation running...');
      const result = await PriceAnalyticsService.recalculateAllStats();
      console.log(`[Job] Price stats recalculated: ${result.updated} updated, ${result.errors} errors`);
    } catch (error) {
      console.error('Price recalculation job failed:', error);
    }
  });
};
