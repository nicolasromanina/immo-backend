import { LeadTagService } from '../services/LeadTagService';

/**
 * Daily job to notify promoteurs about uncontacted leads after 2 days
 * Should be scheduled to run once per day (e.g., at 9 AM)
 */
export async function notifyUncontactedLeadsJob(): Promise<void> {
  console.log('[notifyUncontactedLeadsJob] Starting job to notify about uncontacted leads...');

  try {
    // Process leads not contacted after 2 days
    await LeadTagService.processNotContactedReminders(2);
    console.log('[notifyUncontactedLeadsJob] Job completed successfully');
  } catch (error) {
    console.error('[notifyUncontactedLeadsJob] Job failed:', error);
    throw error;
  }
}

/**
 * Manual trigger endpoint - can be called from admin panel or cron service
 */
export async function triggerNotifyUncontactedLeadsJob(): Promise<any> {
  try {
    await notifyUncontactedLeadsJob();
    return { success: true, message: 'Job executed successfully' };
  } catch (error) {
    return { success: false, message: (error as any).message };
  }
}
