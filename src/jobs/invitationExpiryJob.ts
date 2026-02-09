import cron from 'node-cron';

export const startInvitationExpiryJob = () => {
  if (process.env.INVITATION_EXPIRY_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.INVITATION_EXPIRY_CRON || '0 2 * * *'; // Daily at 2 AM

  cron.schedule(schedule, async () => {
    try {
      await invitationExpiryJob();
    } catch (error) {
      console.error('Error in invitation expiry job:', error);
    }
  });
};

const invitationExpiryJob = async () => {
  const { default: OrganizationInvitation } = await import('../models/OrganizationInvitation');

  const expiredInvitations = await OrganizationInvitation.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    {
      status: 'expired'
    }
  );

  console.log(`Expired ${expiredInvitations.modifiedCount} invitations`);
};