"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const promoteurRoutes_1 = __importDefault(require("./routes/promoteurRoutes"));
const publicPromoteurRoutes_1 = __importDefault(require("./routes/publicPromoteurRoutes"));
const publicServiceRoutes_1 = __importDefault(require("./routes/publicServiceRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const leadRoutes_1 = __importDefault(require("./routes/leadRoutes"));
const updateRoutes_1 = __importDefault(require("./routes/updateRoutes"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const clientRoutes_1 = __importDefault(require("./routes/clientRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const templateRoutes_1 = __importDefault(require("./routes/templateRoutes"));
const appealRoutes_1 = __importDefault(require("./routes/appealRoutes"));
const caseRoutes_1 = __importDefault(require("./routes/caseRoutes"));
const comparisonRoutes_1 = __importDefault(require("./routes/comparisonRoutes"));
const reportingRoutes_1 = __importDefault(require("./routes/reportingRoutes"));
const alertRoutes_1 = __importDefault(require("./routes/alertRoutes"));
const favoriteRoutes_1 = __importDefault(require("./routes/favoriteRoutes"));
const badgeRoutes_1 = __importDefault(require("./routes/badgeRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const mediaRoutes_1 = __importDefault(require("./routes/mediaRoutes"));
const whatsAppRoutes_1 = __importDefault(require("./routes/whatsAppRoutes"));
const crmRoutes_1 = __importDefault(require("./routes/crmRoutes"));
// New feature routes
const appointmentRoutes_1 = __importDefault(require("./routes/appointmentRoutes"));
const partnerRoutes_1 = __importDefault(require("./routes/partnerRoutes"));
const gdprRoutes_1 = __importDefault(require("./routes/gdprRoutes"));
const academyRoutes_1 = __importDefault(require("./routes/academyRoutes"));
const featuredRoutes_1 = __importDefault(require("./routes/featuredRoutes"));
const invoiceRoutes_1 = __importDefault(require("./routes/invoiceRoutes"));
const securityRoutes_1 = __importDefault(require("./routes/securityRoutes"));
const trustScoreRoutes_1 = __importDefault(require("./routes/trustScoreRoutes"));
const brochureRoutes_1 = __importDefault(require("./routes/brochureRoutes"));
const enterpriseContractRoutes_1 = __importDefault(require("./routes/enterpriseContractRoutes"));
// New feature routes - v2
const travelPlanRoutes_1 = __importDefault(require("./routes/travelPlanRoutes"));
const priceAnalyticsRoutes_1 = __importDefault(require("./routes/priceAnalyticsRoutes"));
const geoPhotoRoutes_1 = __importDefault(require("./routes/geoPhotoRoutes"));
const autoBrochureRoutes_1 = __importDefault(require("./routes/autoBrochureRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
// New feature routes - v3
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const questionRoutes_1 = __importDefault(require("./routes/questionRoutes"));
// New feature routes - v4
const supportRoutes_1 = __importDefault(require("./routes/supportRoutes"));
const disclaimerRoutes_1 = __importDefault(require("./routes/disclaimerRoutes"));
const adminGeoRoutes_1 = __importDefault(require("./routes/adminGeoRoutes"));
const managedServiceRoutes_1 = __importDefault(require("./routes/managedServiceRoutes"));
const adsRoutes_1 = __importDefault(require("./routes/adsRoutes"));
const crisisRoutes_1 = __importDefault(require("./routes/crisisRoutes"));
const consistencyRoutes_1 = __importDefault(require("./routes/consistencyRoutes"));
const vipRoutes_1 = __importDefault(require("./routes/vipRoutes"));
const openGraphRoutes_1 = __importDefault(require("./routes/openGraphRoutes"));
const aiAssistantRoutes_1 = __importDefault(require("./routes/aiAssistantRoutes"));
const partnerWorkflowRoutes_1 = __importDefault(require("./routes/partnerWorkflowRoutes"));
const teamManagementRoutes_1 = __importDefault(require("./routes/teamManagementRoutes"));
const abTestRoutes_1 = __importDefault(require("./routes/abTestRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./config/swagger"));
const cors_1 = __importStar(require("./config/cors"));
const errorHandler_1 = require("./middlewares/errorHandler");
const helmet_1 = __importDefault(require("helmet"));
const cors_2 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const paymentController_1 = require("./controllers/paymentController");
const app = (0, express_1.default)();
// Serve uploads folder for local documents
app.use('/uploads', express_1.default.static('uploads'));
// Webhook Stripe doit être AVANT express.json() pour avoir le body brut
// Monté directement pour éviter le double-path via le router
app.post('/api/payments/webhook', express_1.default.raw({ type: 'application/json' }), paymentController_1.handleStripeWebhook);
// Ensuite le middleware JSON pour toutes les autres routes
app.use(express_1.default.json({ limit: '10mb' }));
// Security middlewares
if (process.env.TRUST_PROXY === 'true')
    app.set('trust proxy', 1);
app.use((0, helmet_1.default)());
app.use((0, cors_2.default)(cors_1.default));
// Log autorisations CORS en démarrage
if (process.env.NODE_ENV === 'development') {
    (0, cors_1.logAllowedOrigins)();
}
const limiter = (0, express_rate_limit_1.default)({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
// Rate limiting strict pour les endpoints sensibles (anti brute-force)
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de tentatives, veuillez réessayer dans 15 minutes' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
// Limite body size pour prévenir les attaques par payload
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/public/promoteurs', publicPromoteurRoutes_1.default);
app.use('/api/public', publicServiceRoutes_1.default);
app.use('/api/promoteurs', promoteurRoutes_1.default);
app.use('/api/team', teamManagementRoutes_1.default);
app.use('/api/projects', projectRoutes_1.default);
app.use('/api/leads', leadRoutes_1.default);
app.use('/api/updates', updateRoutes_1.default);
app.use('/api/documents', documentRoutes_1.default);
app.use('/api/client', clientRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
// New Routes
app.use('/api/templates', templateRoutes_1.default);
app.use('/api/appeals', appealRoutes_1.default);
app.use('/api/cases', caseRoutes_1.default);
app.use('/api/comparisons', comparisonRoutes_1.default);
app.use('/api/reporting', reportingRoutes_1.default);
app.use('/api/alerts', alertRoutes_1.default);
app.use('/api/favorites', favoriteRoutes_1.default);
app.use('/api/badges', badgeRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/media', mediaRoutes_1.default);
app.use('/api/whatsapp', whatsAppRoutes_1.default);
app.use('/api/crm', crmRoutes_1.default);
// New feature routes
app.use('/api/appointments', appointmentRoutes_1.default);
app.use('/api/partners', partnerRoutes_1.default);
app.use('/api/gdpr', gdprRoutes_1.default);
app.use('/api/academy', academyRoutes_1.default);
app.use('/api/featured', featuredRoutes_1.default);
app.use('/api/invoices', invoiceRoutes_1.default);
app.use('/api/security-incidents', securityRoutes_1.default);
app.use('/api/trust-score-config', trustScoreRoutes_1.default);
app.use('/api/brochures', brochureRoutes_1.default);
app.use('/api/enterprise-contracts', enterpriseContractRoutes_1.default);
// New feature routes - v2
app.use('/api/travel-plans', travelPlanRoutes_1.default);
app.use('/api/price-analytics', priceAnalyticsRoutes_1.default);
app.use('/api/geo-photos', geoPhotoRoutes_1.default);
app.use('/api/auto-brochures', autoBrochureRoutes_1.default);
// New feature routes - v3
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/questions', questionRoutes_1.default);
// New feature routes - v4
app.use('/api/support', supportRoutes_1.default);
app.use('/api/disclaimers', disclaimerRoutes_1.default);
app.use('/api/admin-geo', adminGeoRoutes_1.default);
app.use('/api/managed-services', managedServiceRoutes_1.default);
app.use('/api/ads', adsRoutes_1.default);
app.use('/api/crisis', crisisRoutes_1.default);
app.use('/api/consistency', consistencyRoutes_1.default);
app.use('/api/vip-requests', vipRoutes_1.default);
app.use('/api/og', openGraphRoutes_1.default);
app.use('/api/ai-assistant', aiAssistantRoutes_1.default);
app.use('/api/partner-workflows', partnerWorkflowRoutes_1.default);
app.use('/api/ab-tests', abTestRoutes_1.default);
app.use('/api/reviews', reviewRoutes_1.default);
// API Documentation
app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default));
app.get('/', (_req, res) => res.send('Real Estate Platform API is running'));
app.use(errorHandler_1.errorHandler);
exports.default = app;
