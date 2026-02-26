"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../controllers/paymentController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = express_1.default.Router();
// Routes protégées pour les promoteurs
router.post('/create-checkout-session', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), paymentController_1.createCheckoutSession);
router.post('/create-boost-session', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), paymentController_1.createBoostCheckoutSession);
router.post('/create-retainer-session', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), paymentController_1.createRetainerSession);
router.post('/create-success-fee-session', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), paymentController_1.createSuccessFeeSession);
router.get('/verify-boost-session', auth_1.authenticateJWT, paymentController_1.verifyBoostSession);
router.get('/verify-upgrade-session', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), paymentController_1.verifyUpgradeSession);
router.get('/get-token-from-boost-session', auth_1.authenticateJWT, paymentController_1.getTokenFromBoostSession);
router.post('/cancel-subscription', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), paymentController_1.cancelSubscription);
router.get('/subscription', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), paymentController_1.getCurrentSubscription);
router.get('/history', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR), paymentController_1.getPaymentHistory);
// Routes admin pour gérer les boosts
router.get('/admin/pending-boosts', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), paymentController_1.getPendingBoosts);
router.post('/admin/approve-boost', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), paymentController_1.approveBoost);
router.post('/admin/reject-boost', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), paymentController_1.rejectBoost);
// Webhook Stripe (pas d'authentification, Stripe signe les requêtes)
// Note: Cette route doit être ajoutée AVANT express.json() dans app.ts
router.post('/webhook', express_1.default.raw({ type: 'application/json' }), paymentController_1.handleStripeWebhook);
exports.default = router;
