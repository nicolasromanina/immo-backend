import cron from 'node-cron';
import { EnterpriseContractService } from '../services/EnterpriseContractService';

export const startEnterpriseContractJob = () => {
  if (process.env.ENTERPRISE_CONTRACT_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.ENTERPRISE_CONTRACT_CRON || '0 9 * * *';

  cron.schedule(schedule, async () => {
    try {
      console.log('[Job] Enterprise contract renewal check running...');
      const expiring = await EnterpriseContractService.checkExpiringContracts(30);
      console.log(`[Job] Enterprise contracts expiring within 30 days: ${expiring}`);
    } catch (error) {
      console.error('Enterprise contract job failed:', error);
    }
  });
};
