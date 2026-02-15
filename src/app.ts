import express from 'express';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import promoteurRoutes from './routes/promoteurRoutes';
import publicPromoteurRoutes from './routes/publicPromoteurRoutes';
import projectRoutes from './routes/projectRoutes';
import leadRoutes from './routes/leadRoutes';
import updateRoutes from './routes/updateRoutes';
import documentRoutes from './routes/documentRoutes';
import clientRoutes from './routes/clientRoutes';
import adminRoutes from './routes/adminRoutes';
import templateRoutes from './routes/templateRoutes';
import appealRoutes from './routes/appealRoutes';
import caseRoutes from './routes/caseRoutes';
import comparisonRoutes from './routes/comparisonRoutes';
import reportingRoutes from './routes/reportingRoutes';
import alertRoutes from './routes/alertRoutes';
import favoriteRoutes from './routes/favoriteRoutes';
import badgeRoutes from './routes/badgeRoutes';
import paymentRoutes from './routes/paymentRoutes';
import mediaRoutes from './routes/mediaRoutes';
import whatsAppRoutes from './routes/whatsAppRoutes';
import crmRoutes from './routes/crmRoutes';
// New feature routes
import appointmentRoutes from './routes/appointmentRoutes';
import partnerRoutes from './routes/partnerRoutes';
import gdprRoutes from './routes/gdprRoutes';
import academyRoutes from './routes/academyRoutes';
import featuredRoutes from './routes/featuredRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import securityRoutes from './routes/securityRoutes';
import trustScoreRoutes from './routes/trustScoreRoutes';
import brochureRoutes from './routes/brochureRoutes';
import enterpriseContractRoutes from './routes/enterpriseContractRoutes';

// New feature routes - v2
import travelPlanRoutes from './routes/travelPlanRoutes';
import priceAnalyticsRoutes from './routes/priceAnalyticsRoutes';
import geoPhotoRoutes from './routes/geoPhotoRoutes';
import autoBrochureRoutes from './routes/autoBrochureRoutes';
import ChatRoutes from './routes/chatRoutes';
// New feature routes - v3
import reportRoutes from './routes/reportRoutes';
import questionRoutes from './routes/questionRoutes';
// New feature routes - v4
import supportRoutes from './routes/supportRoutes';
import disclaimerRoutes from './routes/disclaimerRoutes';
import adminGeoRoutes from './routes/adminGeoRoutes';
import managedServiceRoutes from './routes/managedServiceRoutes';
import adsRoutes from './routes/adsRoutes';
import crisisRoutes from './routes/crisisRoutes';
import consistencyRoutes from './routes/consistencyRoutes';
import vipRoutes from './routes/vipRoutes';
import openGraphRoutes from './routes/openGraphRoutes';
import aiAssistantRoutes from './routes/aiAssistantRoutes';
import partnerWorkflowRoutes from './routes/partnerWorkflowRoutes';
import teamManagementRoutes from './routes/teamManagementRoutes';
import abTestRoutes from './routes/abTestRoutes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { errorHandler } from './middlewares/errorHandler';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { handleStripeWebhook } from './controllers/paymentController';

const app = express();

// Serve uploads folder for local documents
app.use('/uploads', express.static('uploads'));

// Webhook Stripe doit être AVANT express.json() pour avoir le body brut
// Monté directement pour éviter le double-path via le router
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Ensuite le middleware JSON pour toutes les autres routes
app.use(express.json());

// Security middlewares
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
	origin: process.env.CORS_ORIGIN || '*',
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({
	windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
	max: Number(process.env.RATE_LIMIT_MAX) || 100,
	standardHeaders: true,
	legacyHeaders: false,
});
app.use(limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/public/promoteurs', publicPromoteurRoutes);
app.use('/api/promoteurs', promoteurRoutes);
app.use('/api/team', teamManagementRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', ChatRoutes);
// New Routes
app.use('/api/templates', templateRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/comparisons', comparisonRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/whatsapp', whatsAppRoutes);
app.use('/api/crm', crmRoutes);

// New feature routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/academy', academyRoutes);
app.use('/api/featured', featuredRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/security-incidents', securityRoutes);
app.use('/api/trust-score-config', trustScoreRoutes);
app.use('/api/brochures', brochureRoutes);
app.use('/api/enterprise-contracts', enterpriseContractRoutes);

// New feature routes - v2
app.use('/api/travel-plans', travelPlanRoutes);
app.use('/api/price-analytics', priceAnalyticsRoutes);
app.use('/api/geo-photos', geoPhotoRoutes);
app.use('/api/auto-brochures', autoBrochureRoutes);
// New feature routes - v3
app.use('/api/reports', reportRoutes);
app.use('/api/questions', questionRoutes);

// New feature routes - v4
app.use('/api/support', supportRoutes);
app.use('/api/disclaimers', disclaimerRoutes);
app.use('/api/admin-geo', adminGeoRoutes);
app.use('/api/managed-services', managedServiceRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/crisis', crisisRoutes);
app.use('/api/consistency', consistencyRoutes);
app.use('/api/vip-requests', vipRoutes);
app.use('/api/og', openGraphRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/partner-workflows', partnerWorkflowRoutes);
app.use('/api/ab-tests', abTestRoutes);

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (_req, res) => res.send('Real Estate Platform API is running'));

app.use(errorHandler);

export default app;
