"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionBillingService = void 0;
const Subscription_1 = __importDefault(require("../models/Subscription"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const NotificationService_1 = require("./NotificationService");
class SubscriptionBillingService {
    static async sendUpcomingRenewalReminders() {
        const now = new Date();
        const dayMs = 24 * 60 * 60 * 1000;
        const subscriptions = await Subscription_1.default.find({
            status: { $in: ['active', 'trialing'] },
            currentPeriodEnd: { $gte: now },
        });
        let remindersSent = 0;
        for (const sub of subscriptions) {
            const daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / dayMs);
            const promoteur = await Promoteur_1.default.findById(sub.promoteur);
            if (!promoteur?.user)
                continue;
            if (daysLeft === 7 && !sub.billingReminders?.sevenDaysAt) {
                await NotificationService_1.NotificationService.create({
                    recipient: promoteur.user.toString(),
                    type: 'system',
                    title: 'Renouvellement imminent',
                    message: 'Votre abonnement se renouvelle dans 7 jours.',
                    priority: 'medium',
                    channels: { inApp: true, email: true },
                });
                sub.billingReminders = { ...sub.billingReminders, sevenDaysAt: now };
                remindersSent += 1;
            }
            if (daysLeft === 1 && !sub.billingReminders?.oneDayAt) {
                await NotificationService_1.NotificationService.create({
                    recipient: promoteur.user.toString(),
                    type: 'system',
                    title: 'Renouvellement demain',
                    message: 'Votre abonnement se renouvelle demain.',
                    priority: 'high',
                    channels: { inApp: true, email: true },
                });
                sub.billingReminders = { ...sub.billingReminders, oneDayAt: now };
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
        const subscriptions = await Subscription_1.default.find({
            status: { $in: ['past_due', 'incomplete'] },
        });
        let notificationsSent = 0;
        for (const sub of subscriptions) {
            const lastNotified = sub.billingReminders?.pastDueAt;
            if (lastNotified && now.getTime() - lastNotified.getTime() < dayMs) {
                continue;
            }
            const promoteur = await Promoteur_1.default.findById(sub.promoteur);
            if (!promoteur?.user)
                continue;
            await NotificationService_1.NotificationService.create({
                recipient: promoteur.user.toString(),
                type: 'warning',
                title: 'Paiement en echec',
                message: 'Votre abonnement est en echec de paiement. Merci de mettre a jour votre moyen de paiement.',
                priority: 'urgent',
                channels: { inApp: true, email: true },
            });
            sub.billingReminders = { ...sub.billingReminders, pastDueAt: now };
            await sub.save();
            notificationsSent += 1;
        }
        return notificationsSent;
    }
}
exports.SubscriptionBillingService = SubscriptionBillingService;
