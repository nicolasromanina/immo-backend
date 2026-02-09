import Document from '../models/Document';
import { NotificationService } from './NotificationService';

export class DocumentExpiryService {
  static async markExpiredDocuments() {
    const now = new Date();

    const documents = await Document.find({
      expiresAt: { $lte: now },
      status: { $ne: 'expire' },
    }).populate('promoteur', 'user organizationName');

    for (const document of documents) {
      document.status = 'expire';
      await document.save();

      const promoteur: any = document.promoteur;
      if (promoteur?.user) {
        await NotificationService.create({
          recipient: promoteur.user.toString(),
          type: 'warning',
          title: 'Document expire',
          message: `Votre document "${document.name}" est expire`,
          priority: 'high',
          channels: { inApp: true, email: true },
        });
      }
    }

    return documents.length;
  }
}
