import cron from 'node-cron';
import { AdsService } from '../services/AdsService';
import Ad from '../models/Ad';

/**
 * Daily stats aggregation cron job
 * Runs every day at 00:01 UTC to update daily stats for all active ads
 */
export function initAdsCronJobs() {
  // Schedule: runs at 00:01 every day (UTC)
  cron.schedule('1 0 * * *', async () => {
    try {
      console.log('[AdsCronJobs] Starting daily stats aggregation...');
      
      // Find all active ads
      const activeAds = await Ad.find({ status: 'active' });
      console.log(`[AdsCronJobs] Found ${activeAds.length} active ads to update`);
      
      let updated = 0;
      for (const ad of activeAds) {
        try {
          await AdsService.updateDailyStats(ad._id.toString());
          updated++;
        } catch (err: any) {
          console.error(`[AdsCronJobs] Error updating stats for ad ${ad._id}:`, err.message);
        }
      }
      
      console.log(`[AdsCronJobs] Daily stats aggregation completed: ${updated}/${activeAds.length} ads updated`);
    } catch (error: any) {
      console.error('[AdsCronJobs] Error in daily stats aggregation:', error.message);
    }
  });

  console.log('[AdsCronJobs] Initialized - Daily stats aggregation scheduled for 00:01 UTC');
}

/**
 * On startup, also do a catch-up update for today's stats if missing
 */
export async function initAdsCronJobsOnStartup() {
  try {
    console.log('[AdsCronJobs] Running startup catch-up for today...');
    
    const activeAds = await Ad.find({ status: 'active' });
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    let caught = 0;
    for (const ad of activeAds) {
      // Check if today's stat exists
      const hasTodayStat = ad.dailyStats.some(stat => {
        const statDate = new Date(stat.date);
        statDate.setUTCHours(0, 0, 0, 0);
        return statDate.getTime() === today.getTime();
      });
      
      if (!hasTodayStat) {
        await AdsService.updateDailyStats(ad._id.toString());
        caught++;
      }
    }
    
    console.log(`[AdsCronJobs] Startup catch-up completed: ${caught} ads updated`);
  } catch (error: any) {
    console.error('[AdsCronJobs] Error in startup catch-up:', error.message);
  }
}
