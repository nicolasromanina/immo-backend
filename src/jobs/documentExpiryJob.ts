import cron from 'node-cron';
import { DocumentExpiryService } from '../services/DocumentExpiryService';
import { AuditLogService } from '../services/AuditLogService';

export const startDocumentExpiryJob = () => {
  if (process.env.DOCS_EXPIRED_CRON_ENABLED === 'false') {
    return;
  }

  const schedule = process.env.DOCS_EXPIRED_CRON || '0 3 * * *';

  cron.schedule(schedule, async () => {
    try {
      const expiredMarked = await DocumentExpiryService.markExpiredDocuments();
      await AuditLogService.log({
        actor: 'system',
        actorRole: 'system',
        action: 'check_expired_documents',
        category: 'document',
        description: `Marked ${expiredMarked} document(s) as expired`,
      });
    } catch (error) {
      console.error('Document expiry job failed:', error);
    }
  });
};
