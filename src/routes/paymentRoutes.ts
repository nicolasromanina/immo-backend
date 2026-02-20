import express from 'express';
import {
  createCheckoutSession,
  createBoostCheckoutSession,
  handleStripeWebhook,
  cancelSubscription,
  getCurrentSubscription,
  getPaymentHistory,
  verifyBoostSession,
  getTokenFromBoostSession,
  getPendingBoosts,
  approveBoost,
  rejectBoost,
} from '../controllers/paymentController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = express.Router();

// Routes protégées pour les promoteurs
router.post('/create-checkout-session', authenticateJWT, authorizeRoles(Role.PROMOTEUR), createCheckoutSession);
router.post('/create-boost-session', authenticateJWT, authorizeRoles(Role.PROMOTEUR), createBoostCheckoutSession);
router.get('/verify-boost-session', verifyBoostSession);
router.get('/get-token-from-boost-session', getTokenFromBoostSession);
router.post('/cancel-subscription', authenticateJWT, authorizeRoles(Role.PROMOTEUR), cancelSubscription);
router.get('/subscription', authenticateJWT, authorizeRoles(Role.PROMOTEUR), getCurrentSubscription);
router.get('/history', authenticateJWT, authorizeRoles(Role.PROMOTEUR), getPaymentHistory);

// Routes admin pour gérer les boosts
router.get('/admin/pending-boosts', authenticateJWT, authorizeRoles(Role.ADMIN), getPendingBoosts);
router.post('/admin/approve-boost', authenticateJWT, authorizeRoles(Role.ADMIN), approveBoost);
router.post('/admin/reject-boost', authenticateJWT, authorizeRoles(Role.ADMIN), rejectBoost);

// Webhook Stripe (pas d'authentification, Stripe signe les requêtes)
// Note: Cette route doit être ajoutée AVANT express.json() dans app.ts
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
