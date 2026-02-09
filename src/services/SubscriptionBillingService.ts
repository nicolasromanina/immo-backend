import Subscription from '../models/Subscription';
import Promoteur from '../models/Promoteur';
import { NotificationService } from './NotificationService';

export class SubscriptionBillingService {
  static async sendUpcomingRenewalReminders() {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    const subscriptions = await Subscription.find({
      status: { $in: ['active', 'trialing'] },
      currentPeriodEnd: { $gte: now },
    });

    let remindersSent = 0;

    for (const sub of subscriptions) {
      const daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / dayMs);
      const promoteur = await Promoteur.findById(sub.promoteur);
      if (!promoteur?.user) continue;

      if (daysLeft === 7 && !sub.billingReminders?.sevenDaysAt) {
        await NotificationService.create({
          recipient: promoteur.user.toString(),
          type: 'system',
          title: 'Renouvellement imminent',
          message: 'Votre abonnement se renouvelle dans 7 jours.',
          priority: 'medium',
          channels: { inApp: true, email: true },
        });
        sub.billingReminders = { ...sub.billingReminders, sevenDaysAt: now } as any;
        remindersSent += 1;
      }

      if (daysLeft === 1 && !sub.billingReminders?.oneDayAt) {
        await NotificationService.create({
          recipient: promoteur.user.toString(),
          type: 'system',
          title: 'Renouvellement demain',
          message: 'Votre abonnement se renouvelle demain.',
          priority: 'high',
          channels: { inApp: true, email: true },
        });
        sub.billingReminders = { ...sub.billingReminders, oneDayAt: now } as any;
        remindersSent += 1;
      }

      if (sub.isModified()) {
        await sub.save();
      }
    }

    return remindersSent;
  }

  static async notifyPastDueSubscriptions() {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    const subscriptions = await Subscription.find({
      status: { $in: ['past_due', 'incomplete'] },
    });

    let notificationsSent = 0;

    for (const sub of subscriptions) {
      const lastNotified = sub.billingReminders?.pastDueAt;
      if (lastNotified && now.getTime() - lastNotified.getTime() < dayMs) {
        continue;
      }

      const promoteur = await Promoteur.findById(sub.promoteur);
      if (!promoteur?.user) continue;

      await NotificationService.create({
        recipient: promoteur.user.toString(),
        type: 'warning',
        title: 'Paiement en echec',
        message: 'Votre abonnement est en echec de paiement. Merci de mettre a jour votre moyen de paiement.',
        priority: 'urgent',
        channels: { inApp: true, email: true },
      });

      sub.billingReminders = { ...sub.billingReminders, pastDueAt: now } as any;
      await sub.save();
      notificationsSent += 1;
    }

    return notificationsSent;
  }
}
