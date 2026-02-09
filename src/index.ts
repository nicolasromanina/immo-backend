import dotenv from 'dotenv';

// Charger les variables d'environnement en premier
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import { startDocumentExpiryJob } from './jobs/documentExpiryJob';
import { startScheduledUpdatesJob } from './jobs/scheduledUpdatesJob';
import { startSubscriptionBillingJob } from './jobs/subscriptionBillingJob';
import { startLeadFollowUpJob } from './jobs/leadFollowUpJob';
// New job imports
import { startAppointmentReminderJob } from './jobs/appointmentReminderJob';
import { startInvoiceReminderJob } from './jobs/invoiceReminderJob';
import { startGDPRDeadlineJob } from './jobs/gdprDeadlineJob';
import { startFeaturedSlotJob } from './jobs/featuredSlotJob';
import { startTrustScoreRecalculationJob } from './jobs/trustScoreRecalculationJob';
import { startEnterpriseContractJob } from './jobs/enterpriseContractJob';
import { startPlanChangeJob } from './jobs/planChangeJob';
// New jobs - v3
import { startInvitationExpiryJob } from './jobs/invitationExpiryJob';
import { startShareTokenCleanupJob } from './jobs/shareTokenCleanupJob';
// New jobs - v4
import { startAutomatedSanctionsJob } from './jobs/automatedSanctionsJob';
import { startSLAMonitoringJob } from './jobs/slaMonitoringJob';
import { startBadgeExpirationJob } from './jobs/badgeExpirationJob';
import { startPriceRecalculationJob } from './jobs/priceRecalculationJob';

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
	// Existing jobs
	startDocumentExpiryJob();
	startScheduledUpdatesJob();
	startSubscriptionBillingJob();
	startLeadFollowUpJob();
	// New jobs
	startAppointmentReminderJob();
	startInvoiceReminderJob();
	startGDPRDeadlineJob();
	startFeaturedSlotJob();
	startTrustScoreRecalculationJob();
	startEnterpriseContractJob();
	startPlanChangeJob();
	// New jobs - v3
	startInvitationExpiryJob();
	startShareTokenCleanupJob();
	// New jobs - v4
	startAutomatedSanctionsJob();
	startSLAMonitoringJob();
	startBadgeExpirationJob();
	startPriceRecalculationJob();
	
	app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
