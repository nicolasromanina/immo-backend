import Lead from '../models/Lead';
import Promoteur from '../models/Promoteur';
import { NotificationService } from './NotificationService';

export class LeadFollowUpService {
  static async notifyOverdueFollowUps() {
    const now = new Date();
    const leads = await Lead.find({
      nextFollowUpDate: { $lte: now },
      status: { $nin: ['gagne', 'perdu'] },
    }).populate('project', 'title');

    let notified = 0;

    for (const lead of leads) {
      const promoteur = await Promoteur.findById(lead.promoteur);
      if (!promoteur?.user) continue;

      await NotificationService.create({
        recipient: promoteur.user.toString(),
        type: 'lead',
        title: 'Relance lead en retard',
        message: `Relance a faire pour ${lead.firstName} ${lead.lastName}`,
        relatedLead: lead._id.toString(),
        priority: 'high',
        channels: { inApp: true, email: true },
      });
      notified += 1;
    }

    return notified;
  }

  static async notifyUnansweredNewLeads() {
    const now = new Date();
    const threshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const leads = await Lead.find({
      status: 'nouveau',
      createdAt: { $lte: threshold },
    }).populate('project', 'title');

    let notified = 0;

    for (const lead of leads) {
      const promoteur = await Promoteur.findById(lead.promoteur);
      if (!promoteur?.user) continue;

      await NotificationService.create({
        recipient: promoteur.user.toString(),
        type: 'lead',
        title: 'Lead sans reponse',
        message: `Le lead ${lead.firstName} ${lead.lastName} n'a pas ete traite sous 24h`,
        relatedLead: lead._id.toString(),
        priority: 'urgent',
        channels: { inApp: true, email: true },
      });
      notified += 1;
    }

    return notified;
  }
}
