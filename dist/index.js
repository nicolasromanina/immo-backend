"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Charger les variables d'environnement en premier
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const websocket_1 = require("./config/websocket");
const documentExpiryJob_1 = require("./jobs/documentExpiryJob");
const scheduledUpdatesJob_1 = require("./jobs/scheduledUpdatesJob");
const subscriptionBillingJob_1 = require("./jobs/subscriptionBillingJob");
const leadFollowUpJob_1 = require("./jobs/leadFollowUpJob");
// New job imports
const appointmentReminderJob_1 = require("./jobs/appointmentReminderJob");
const invoiceReminderJob_1 = require("./jobs/invoiceReminderJob");
const gdprDeadlineJob_1 = require("./jobs/gdprDeadlineJob");
const featuredSlotJob_1 = require("./jobs/featuredSlotJob");
const trustScoreRecalculationJob_1 = require("./jobs/trustScoreRecalculationJob");
const enterpriseContractJob_1 = require("./jobs/enterpriseContractJob");
const planChangeJob_1 = require("./jobs/planChangeJob");
// New jobs - v3
const invitationExpiryJob_1 = require("./jobs/invitationExpiryJob");
const shareTokenCleanupJob_1 = require("./jobs/shareTokenCleanupJob");
// New jobs - v4
const automatedSanctionsJob_1 = require("./jobs/automatedSanctionsJob");
const slaMonitoringJob_1 = require("./jobs/slaMonitoringJob");
const badgeExpirationJob_1 = require("./jobs/badgeExpirationJob");
const priceRecalculationJob_1 = require("./jobs/priceRecalculationJob");
const onboardingReminderJob_1 = require("./jobs/onboardingReminderJob");
const notifyUncontactedLeadsJobWrapper_1 = require("./jobs/notifyUncontactedLeadsJobWrapper");
const adsCronJobs_1 = require("./cron/adsCronJobs");
const PORT = process.env.PORT || 5000;
(0, db_1.connectDB)().then(() => {
    // Create HTTP server and attach WebSocket
    const server = http_1.default.createServer(app_1.default);
    (0, websocket_1.initWebSocket)(server);
    console.log('[WS] WebSocket server initialized');
    // Existing jobs
    (0, documentExpiryJob_1.startDocumentExpiryJob)();
    (0, adsCronJobs_1.initAdsCronJobsOnStartup)();
    (0, adsCronJobs_1.initAdsCronJobs)();
    (0, scheduledUpdatesJob_1.startScheduledUpdatesJob)();
    (0, subscriptionBillingJob_1.startSubscriptionBillingJob)();
    (0, leadFollowUpJob_1.startLeadFollowUpJob)();
    // New jobs
    (0, appointmentReminderJob_1.startAppointmentReminderJob)();
    (0, invoiceReminderJob_1.startInvoiceReminderJob)();
    (0, gdprDeadlineJob_1.startGDPRDeadlineJob)();
    (0, featuredSlotJob_1.startFeaturedSlotJob)();
    (0, trustScoreRecalculationJob_1.startTrustScoreRecalculationJob)();
    (0, enterpriseContractJob_1.startEnterpriseContractJob)();
    (0, planChangeJob_1.startPlanChangeJob)();
    // New jobs - v3
    (0, invitationExpiryJob_1.startInvitationExpiryJob)();
    (0, shareTokenCleanupJob_1.startShareTokenCleanupJob)();
    // New jobs - v4
    (0, automatedSanctionsJob_1.startAutomatedSanctionsJob)();
    (0, slaMonitoringJob_1.startSLAMonitoringJob)();
    (0, badgeExpirationJob_1.startBadgeExpirationJob)();
    (0, priceRecalculationJob_1.startPriceRecalculationJob)();
    (0, onboardingReminderJob_1.startOnboardingReminderJob)();
    // Lead management jobs - v5
    (0, notifyUncontactedLeadsJobWrapper_1.startUncontactedLeadsNotificationJob)();
    server.listen(PORT, () => console.log(`Server running on port ${PORT} with WebSocket support`));
});
