import cron from 'node-cron';

export const startShareTokenCleanupJob = () => {
  if (process.env.SHARE_TOKEN_CLEANUP_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.SHARE_TOKEN_CLEANUP_CRON || '0 3 * * *'; // Daily at 3 AM

  cron.schedule(schedule, async () => {
    try {
      await shareTokenCleanupJob();
    } catch (error) {
      console.error('Error in share token cleanup job:', error);
    }
  });
};

const shareTokenCleanupJob = async () => {
  const { default: DocumentShareToken } = await import('../models/DocumentShareToken');

  const expiredTokens = await DocumentShareToken.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: new Date() }
    },
    {
      status: 'expired'
    }
  );

  console.log(`Expired ${expiredTokens.modifiedCount} share tokens`);
};