"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOnboardingReminderForPromoteur = sendOnboardingReminderForPromoteur;
exports.startOnboardingReminderJob = startOnboardingReminderJob;
const node_cron_1 = __importDefault(require("node-cron"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const Notification_1 = __importDefault(require("../models/Notification"));
const NotificationService_1 = require("../services/NotificationService");
const DEFAULT_OFFSETS_PROD = [2880, 1440]; // minutes (2 days, 1 day)
const DEFAULT_OFFSETS_DEV = [20, 10]; // minutes for development testing
const DEFAULT_WINDOW_MINUTES = 2; // window to match trial end
function parseOffsets() {
    const raw = process.env.ONBOARDING_REMINDER_OFFSETS;
    if (raw) {
        try {
            return raw.split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n) && n > 0);
        }
        catch (e) {
            console.warn('[onboardingReminder] Failed to parse ONBOARDING_REMINDER_OFFSETS, falling back to defaults');
        }
    }
    return process.env.NODE_ENV === 'development' ? DEFAULT_OFFSETS_DEV : DEFAULT_OFFSETS_PROD;
}
async function sendOnboardingReminderForPromoteur(promoteurId, offsetMinutes) {
    const promoteur = await Promoteur_1.default.findById(promoteurId).populate('user', 'email firstName');
    if (!promoteur)
        throw new Error('Promoteur not found');
    if (!promoteur.trialEndsAt)
        throw new Error('No trialEndsAt set for promoteur');
    const offsets = offsetMinutes ? [offsetMinutes] : parseOffsets();
    const sent = [];
    for (const offset of offsets) {
        try {
            // Dedup: check if we've already sent a reminder for this promoteur + offset + trialEndsAt
            const exists = await Notification_1.default.findOne({
                recipient: promoteur.user?._id?.toString() || null,
                type: 'reminder',
                'data.onboardingReminderOffset': offset,
                'data.trialEndsAt': promoteur.trialEndsAt,
            });
            if (exists) {
                continue;
            }
            const human = offset >= 1440 ? `${Math.round(offset / 1440)} jour(s)` : `${offset} minute(s)`;
            const title = `Rappel : onboarding dans ${human}`;
            const message = `Votre période d'essai se termine dans ${human}. Complétez votre onboarding pour bénéficier d'un meilleur référencement et des fonctionnalités.`;
            await NotificationService_1.NotificationService.create({
                recipient: promoteur.user._id.toString(),
                type: 'reminder',
                title,
                message,
                channels: { inApp: true, email: true },
                actionUrl: '/onboarding',
                actionLabel: "Compléter l'onboarding",
                priority: 'medium',
                data: { onboardingReminderOffset: offset, trialEndsAt: promoteur.trialEndsAt },
            });
            sent.push(String(offset));
            console.log(`[onboardingReminder] Sent reminder for promoteur ${promoteur._id} offset ${offset} minutes`);
        }
        catch (err) {
            console.error('[onboardingReminder] Failed to send reminder for', promoteurId, 'offset', offset, err);
        }
    }
    return { promoteurId, sent };
}
function startOnboardingReminderJob() {
    const offsets = parseOffsets();
    console.log('[onboardingReminder] Starting job with offsets (minutes):', offsets);
    // Run every minute
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            for (const offset of offsets) {
                const windowStart = new Date(now.getTime() + offset * 60 * 1000);
                const windowEnd = new Date(windowStart.getTime() + DEFAULT_WINDOW_MINUTES * 60 * 1000);
                // Find promoteurs where trialEndsAt falls into the target window, still on trial and not completed onboarding
                const targets = await Promoteur_1.default.find({
                    trialEndsAt: { $gte: windowStart, $lte: windowEnd },
                    subscriptionStatus: 'trial',
                    onboardingCompleted: false,
                }).populate('user', 'email firstName');
                for (const p of targets) {
                    try {
                        // Check duplication
                        const already = await Notification_1.default.findOne({
                            recipient: p.user?._id?.toString() || null,
                            type: 'reminder',
                            'data.onboardingReminderOffset': offset,
                            'data.trialEndsAt': p.trialEndsAt,
                        });
                        if (already)
                            continue;
                        const human = offset >= 1440 ? `${Math.round(offset / 1440)} jour(s)` : `${offset} minute(s)`;
                        const title = `Rappel : onboarding dans ${human}`;
                        const message = `Votre période d'essai se termine dans ${human}. Complétez votre onboarding pour en bénéficier pleinement.`;
                        await NotificationService_1.NotificationService.create({
                            recipient: p.user._id.toString(),
                            type: 'reminder',
                            title,
                            message,
                            channels: { inApp: true, email: true },
                            actionUrl: '/onboarding',
                            actionLabel: "Compléter l'onboarding",
                            priority: 'medium',
                            data: { onboardingReminderOffset: offset, trialEndsAt: p.trialEndsAt },
                        });
                        console.log(`[onboardingReminder] Auto-sent reminder for promoteur ${p._id} (offset ${offset}min)`);
                    }
                    catch (err) {
                        console.error('[onboardingReminder] Error sending reminder for promoteur', p._id, err);
                    }
                }
            }
        }
        catch (err) {
            console.error('[onboardingReminder] Cron job error', err);
        }
    });
}
