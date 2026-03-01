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
exports.rejectBoost = exports.approveBoost = exports.getPendingBoosts = exports.getPaymentHistory = exports.getCurrentSubscription = exports.cancelSubscription = exports.verifyUpgradeSession = exports.verifyBoostSession = exports.getTokenFromBoostSession = exports.handleStripeWebhook = exports.createBoostCheckoutSession = exports.createSuccessFeeSession = exports.createRetainerSession = exports.createCheckoutSession = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const stripe_1 = require("../config/stripe");
const Subscription_1 = __importDefault(require("../models/Subscription"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const User_1 = __importDefault(require("../models/User"));
const NotificationService_1 = require("../services/NotificationService");
const jwt_1 = require("../config/jwt");
// ...existing code...
// Exporter explicitement les fonctions publiques Ã  la toute fin du fichier
// (aprÃ¨s leur dÃ©finition effective)
/**
 * CrÃ©er une session Checkout pour l'abonnement
 */
const createCheckoutSession = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { plan } = req.body; // 'starter', 'publie', 'verifie', 'partenaire'
        if (!userId) {
            return res.status(401).json({ message: 'Non authentifiÃ©' });
        }
        if (plan === 'enterprise') {
            return res.status(400).json({ message: 'Le plan Enterprise nÃ©cessite de contacter notre Ã©quipe commerciale.' });
        }
        if (!['starter', 'publie', 'verifie', 'partenaire'].includes(plan)) {
            return res.status(400).json({ message: 'Plan invalide' });
        }
        // RÃ©cupÃ©rer le promoteur
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvÃ©' });
        }
        const promoteur = await Promoteur_1.default.findOne({ user: userId });
        if (!promoteur) {
            return res.status(404).json({ message: 'Promoteur non trouvÃ©' });
        }
        // Créer ou récupérer le customer Stripe
        let stripeCustomerId = promoteur.stripeCustomerId;
        // Recover gracefully if stored customer no longer exists in Stripe.
        if (stripeCustomerId) {
            try {
                const existingCustomer = await stripe_1.stripe.customers.retrieve(stripeCustomerId);
                if (existingCustomer?.deleted) {
                    stripeCustomerId = undefined;
                }
            }
            catch {
                stripeCustomerId = undefined;
            }
        }
        if (!stripeCustomerId) {
            const customer = await stripe_1.stripe.customers.create({
                email: user.email,
                name: promoteur.organizationName,
                metadata: {
                    userId: userId.toString(),
                    promoteurId: promoteur._id.toString(),
                },
            });
            stripeCustomerId = customer.id;
            // Sauvegarder l'ID customer dans le promoteur
            await Promoteur_1.default.findByIdAndUpdate(promoteur._id, {
                stripeCustomerId: stripeCustomerId,
            });
        }
        // CrÃ©er la session Checkout
        const promoteurUrl = process.env.PROMOTEUR_URL || 'http://localhost:8081';
        console.log('[BOOST] PROMOTEUR_URL utilisÃ© pour Stripe:', promoteurUrl);
        console.log('[BOOST] Stripe success_url:', `${promoteurUrl}/boost-success?session_id={CHECKOUT_SESSION_ID}`);
        console.log('[BOOST] Stripe cancel_url:', `${promoteurUrl}/boost-project`);
        const setupFee = stripe_1.SETUP_FEES[plan] || 0;
        const planLabels = {
            starter: 'Starter',
            publie: 'PubliÃ©',
            verifie: 'VÃ©rifiÃ©',
            partenaire: 'Partenaire',
        };
        const sessionParams = {
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Abonnement ${planLabels[plan] || plan}`,
                            description: `Plan ${plan} annuel pour promoteur`,
                        },
                        unit_amount: stripe_1.SUBSCRIPTION_PRICES[plan],
                        recurring: {
                            interval: stripe_1.BILLING_INTERVAL,
                        },
                    },
                    quantity: 1,
                },
            ],
            success_url: `${promoteurUrl}/promoteur/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${promoteurUrl}/promoteur/pricing`,
            metadata: {
                userId: userId.toString(),
                promoteurId: promoteur._id.toString(),
                plan,
                setupFeeAmount: setupFee.toString(),
            },
        };
        // Ajouter le frais de setup one-shot si applicable
        if (setupFee > 0) {
            sessionParams.line_items.push({
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Frais de mise en place - Plan ${planLabels[plan] || plan}`,
                    },
                    unit_amount: setupFee,
                },
                quantity: 1,
            });
        }
        // Appliquer le discount Founding Partner si applicable
        if (promoteur.isFoundingPartner && promoteur.foundingPartnerDiscount > 0) {
            const discountActive = !promoteur.foundingPartnerExpiresAt || new Date() < new Date(promoteur.foundingPartnerExpiresAt);
            if (discountActive) {
                const coupon = await stripe_1.stripe.coupons.create({
                    percent_off: promoteur.foundingPartnerDiscount,
                    duration: 'once',
                    name: `Founding Partner -${promoteur.foundingPartnerDiscount}%`,
                });
                sessionParams.discounts = [{ coupon: coupon.id }];
            }
        }
        const session = await stripe_1.stripe.checkout.sessions.create(sessionParams);
        res.json({ sessionId: session.id, url: session.url });
    }
    catch (error) {
        console.error('Erreur crÃ©ation session checkout:', error);
        res.status(500).json({ message: 'Erreur lors de la crÃ©ation de la session', error: error.message });
    }
};
exports.createCheckoutSession = createCheckoutSession;
/**
 * CrÃ©er une session Retainer (abonnement mensuel rÃ©current pour services managÃ©s)
 * POST /payments/create-retainer-session
 */
const createRetainerSession = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { retainerType, monthlyFee } = req.body;
        if (!userId)
            return res.status(401).json({ message: 'Non authentifiÃ©' });
        if (!retainerType || !monthlyFee)
            return res.status(400).json({ message: 'retainerType et monthlyFee requis' });
        if (!['updates-only', 'leads-only', 'full'].includes(retainerType)) {
            return res.status(400).json({ message: 'retainerType invalide' });
        }
        const user = await User_1.default.findById(userId);
        const promoteur = await Promoteur_1.default.findOne({ user: userId });
        if (!promoteur)
            return res.status(404).json({ message: 'Promoteur non trouvÃ©' });
        let stripeCustomerId = promoteur.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripe_1.stripe.customers.create({
                email: user.email,
                name: promoteur.organizationName,
                metadata: { userId: userId.toString(), promoteurId: promoteur._id.toString() },
            });
            stripeCustomerId = customer.id;
            await Promoteur_1.default.findByIdAndUpdate(promoteur._id, { stripeCustomerId });
        }
        const retainerLabels = {
            'updates-only': 'Mises Ã  jour seulement',
            'leads-only': 'Leads seulement',
            'full': 'Service complet',
        };
        const promoteurUrl = process.env.PROMOTEUR_URL || 'http://localhost:8081';
        const session = await stripe_1.stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Retainer â€” ${retainerLabels[retainerType]}`,
                            description: `Service managÃ© mensuel (${retainerType})`,
                        },
                        unit_amount: Math.round(monthlyFee * 100),
                        recurring: { interval: 'month' },
                    },
                    quantity: 1,
                }],
            success_url: `${promoteurUrl}/managed-services?retainer=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${promoteurUrl}/managed-services`,
            metadata: {
                userId: userId.toString(),
                promoteurId: promoteur._id.toString(),
                retainerType,
                monthlyFee: monthlyFee.toString(),
            },
        });
        res.json({ sessionId: session.id, url: session.url });
    }
    catch (error) {
        console.error('Erreur crÃ©ation session retainer:', error);
        res.status(500).json({ message: 'Erreur lors de la crÃ©ation de la session retainer', error: error.message });
    }
};
exports.createRetainerSession = createRetainerSession;
/**
 * CrÃ©er un PaymentIntent Success Fee (frais de succÃ¨s one-shot sur vente)
 * POST /payments/create-success-fee-session
 */
const createSuccessFeeSession = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { projectId, saleAmount, feePercent } = req.body;
        if (!userId)
            return res.status(401).json({ message: 'Non authentifiÃ©' });
        if (!projectId || !saleAmount || !feePercent) {
            return res.status(400).json({ message: 'projectId, saleAmount et feePercent requis' });
        }
        if (feePercent <= 0 || feePercent > 20) {
            return res.status(400).json({ message: 'feePercent doit Ãªtre entre 0 et 20%' });
        }
        const user = await User_1.default.findById(userId);
        const promoteur = await Promoteur_1.default.findOne({ user: userId });
        if (!promoteur)
            return res.status(404).json({ message: 'Promoteur non trouvÃ©' });
        const project = await Project_1.default.findById(projectId);
        if (!project)
            return res.status(404).json({ message: 'Projet non trouvÃ©' });
        let stripeCustomerId = promoteur.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripe_1.stripe.customers.create({
                email: user.email,
                name: promoteur.organizationName,
                metadata: { userId: userId.toString(), promoteurId: promoteur._id.toString() },
            });
            stripeCustomerId = customer.id;
            await Promoteur_1.default.findByIdAndUpdate(promoteur._id, { stripeCustomerId });
        }
        const feeAmount = Math.round((saleAmount * feePercent) / 100 * 100); // en centimes
        const promoteurUrl = process.env.PROMOTEUR_URL || 'http://localhost:8081';
        const session = await stripe_1.stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Success Fee â€” ${project.name || projectId}`,
                            description: `${feePercent}% de ${saleAmount.toLocaleString('fr-FR')}â‚¬`,
                        },
                        unit_amount: feeAmount,
                    },
                    quantity: 1,
                }],
            success_url: `${promoteurUrl}/invoices?success_fee=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${promoteurUrl}/invoices`,
            metadata: {
                userId: userId.toString(),
                promoteurId: promoteur._id.toString(),
                projectId,
                saleAmount: saleAmount.toString(),
                feePercent: feePercent.toString(),
                type: 'success_fee',
            },
        });
        res.json({ sessionId: session.id, url: session.url, feeAmount: feeAmount / 100 });
    }
    catch (error) {
        console.error('Erreur crÃ©ation session success fee:', error);
        res.status(500).json({ message: 'Erreur lors de la crÃ©ation de la session success fee', error: error.message });
    }
};
exports.createSuccessFeeSession = createSuccessFeeSession;
/**
 * CrÃ©er une session de paiement pour booster un projet
 * Support des deux modes: boostType prÃ©dÃ©fini OU customAmount flexible
 */
const createBoostCheckoutSession = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { projectId, promoteurId, boostType, customAmount, duration, entityType, placement } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'Non authentifiÃ©' });
        }
        // VÃ©rifier qu'on a soit projectId soit promoteurId (mais pas les deux)
        if (!projectId && !promoteurId) {
            return res.status(400).json({ message: 'projectId ou promoteurId requis' });
        }
        if (projectId && promoteurId) {
            return res.status(400).json({ message: 'Fournir soit projectId soit promoteurId, mais pas les deux' });
        }
        const user = await User_1.default.findById(userId);
        const promoteur = await Promoteur_1.default.findOne({ user: userId });
        if (!promoteur) {
            return res.status(404).json({ message: 'Promoteur non trouvÃ©' });
        }
        // Si promoteurId, vÃ©rifier que c'est le promoteur courant
        if (promoteurId && promoteurId !== promoteur._id.toString()) {
            return res.status(403).json({ message: 'Impossible de booster le profil d\'un autre promoteur' });
        }
        // DÃ©terminer le montant
        let amount;
        let description;
        if (customAmount) {
            // Montant custom (en centimes)
            amount = customAmount;
            // Valider le montant (3-5000â‚¬)
            const amountInEuros = amount / 100;
            if (amountInEuros < 3 || amountInEuros > 5000) {
                return res.status(400).json({
                    message: 'Montant invalide. Le montant doit être entre 3 et 5000 EUR'
                });
            }
            const targetType = projectId ? 'projet' : 'profil';
            description = `Boost ${targetType} personnalisÃ© (${amountInEuros}â‚¬)`;
        }
        else if (boostType) {
            // Montant prÃ©dÃ©fini par type
            if (!['basic', 'premium', 'enterprise'].includes(boostType)) {
                return res.status(400).json({ message: 'Type de boost invalide' });
            }
            amount = stripe_1.BOOST_PRICES[boostType];
            description = `Boost ${boostType}`;
        }
        else {
            return res.status(400).json({ message: 'Montant ou type de boost requis' });
        }
        // CrÃ©er ou rÃ©cupÃ©rer le customer Stripe
        let stripeCustomerId = promoteur.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripe_1.stripe.customers.create({
                email: user.email,
                name: promoteur.organizationName,
                metadata: {
                    userId: userId.toString(),
                    promoteurId: promoteur._id.toString(),
                },
            });
            stripeCustomerId = customer.id;
            await Promoteur_1.default.findByIdAndUpdate(promoteur._id, {
                stripeCustomerId: stripeCustomerId,
            });
        }
        const promoteurUrl = process.env.PROMOTEUR_URL || 'http://localhost:8081';
        console.log('[BOOST] CrÃ©ation de session boost');
        console.log('[BOOST] Type:', projectId ? 'projet' : 'profil');
        if (projectId)
            console.log('[BOOST] projectId:', projectId);
        if (promoteurId)
            console.log('[BOOST] promoteurId:', promoteurId);
        console.log('[BOOST] Montant:', amount, 'centimes (', amount / 100, 'â‚¬)');
        console.log('[BOOST] Placement:', placement || 'default');
        // CrÃ©er la session Checkout
        const session = await stripe_1.stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Boost : ${description}`,
                            description: projectId ? `Projet: ${projectId}` : `Profil promoteur`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${promoteurUrl}/boost-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${promoteurUrl}/${projectId ? 'boost-project' : 'profile'}`,
            metadata: {
                userId: userId.toString(),
                promoteurId: promoteur._id.toString(),
                projectId: projectId || null,
                promoteurBoostId: promoteurId || null,
                boostType: boostType || 'custom',
                duration: (duration || 30).toString(),
                amount: amount.toString(),
                paymentType: 'boost',
                entityType: projectId ? 'project' : 'promoteur',
                placement: placement || 'annuaires',
            },
        });
        console.log('[BOOST] âœ… Session Stripe crÃ©Ã©e avec succÃ¨s');
        console.log('[BOOST] Session ID:', session.id);
        res.json({ sessionId: session.id, url: session.url });
    }
    catch (error) {
        console.error('[BOOST] âŒ Erreur crÃ©ation session boost:', error);
        res.status(500).json({
            message: 'Erreur lors de la crÃ©ation de la session',
            error: error.message
        });
    }
};
exports.createBoostCheckoutSession = createBoostCheckoutSession;
/**
 * Webhook Stripe pour gÃ©rer les Ã©vÃ©nements
 */
const handleStripeWebhook = async (req, res) => {
    console.log('[STRIPE WEBHOOK] ðŸ”” Webhook endpoint hit!');
    console.log('[STRIPE WEBHOOK] Method:', req.method);
    console.log('[STRIPE WEBHOOK] URL:', req.url);
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('âŒ STRIPE_WEBHOOK_SECRET non dÃ©fini');
        return res.status(500).send('Configuration webhook manquante');
    }
    let event;
    try {
        event = stripe_1.stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log('[STRIPE WEBHOOK] âœ… Webhook verified successfully');
    }
    catch (err) {
        console.error('âŒ Erreur webhook signature:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    console.log('[STRIPE WEBHOOK] Received event type:', event.type);
    console.log('[STRIPE WEBHOOK] Event ID:', event.id);
    const eventData = event.data.object;
    if (eventData.metadata) {
        console.log('[STRIPE WEBHOOK] Metadata:', eventData.metadata);
        console.log('[STRIPE WEBHOOK] Payment Type:', eventData.metadata.paymentType);
    }
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                console.log('[STRIPE WEBHOOK] ðŸŽ¯ Processing checkout.session.completed');
                console.log('[STRIPE WEBHOOK] Payment Type from metadata:', eventData.metadata?.paymentType);
                await handleCheckoutSessionCompleted(event.data.object);
                break;
            case 'invoice.paid':
                await handleInvoicePaid(event.data.object);
                break;
            case 'customer.subscription.updated':
            case 'customer.subscription.created':
                await handleSubscriptionUpdate(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;
            default:
                console.log(`Ã‰vÃ©nement non gÃ©rÃ©: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('âŒ Erreur traitement webhook:', error);
        console.error('âŒ Stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
};
exports.handleStripeWebhook = handleStripeWebhook;
/**
 * GÃ©rer la complÃ©tion d'une session checkout
 */
async function handleCheckoutSessionCompleted(session) {
    const promoteurId = session.metadata.promoteurId;
    const plan = session.metadata.plan;
    const paymentType = session.metadata.paymentType;
    console.log('[handleCheckoutSessionCompleted] Session metadata:', {
        promoteurId,
        plan,
        paymentType,
        customerId: session.customer,
        mode: session.mode,
        allMetadata: session.metadata
    });
    if (paymentType === 'become-promoteur') {
        // Handle become-promoteur payment
        const userId = session.metadata.userId;
        const organizationName = session.metadata.organizationName;
        const organizationType = session.metadata.organizationType || 'individual';
        const selectedPlan = session.metadata.plan || 'starter';
        try {
            // Add promoteur role to user
            await User_1.default.findByIdAndUpdate(userId, {
                $addToSet: { roles: 'promoteur' },
            });
            // Create Promoteur profile
            const promoteur = new Promoteur_1.default({
                user: userId,
                organizationName,
                organizationType,
                plan: selectedPlan,
                subscriptionStatus: 'active',
                subscriptionStartDate: new Date(),
                kycStatus: 'pending',
                onboardingCompleted: false,
                onboardingProgress: 0,
                complianceStatus: 'publie',
                financialProofLevel: 'none',
                trustScore: 10,
                totalProjects: 0,
                activeProjects: 0,
                completedProjects: 0,
                totalLeadsReceived: 0,
                stripeCustomerId: session.customer,
                paymentHistory: [{
                        amount: session.amount_total,
                        type: 'onboarding',
                        status: 'paid',
                        date: new Date(),
                    }],
            });
            await promoteur.save();
            // Link promoteur profile to user
            await User_1.default.findByIdAndUpdate(userId, {
                promoteurProfile: promoteur._id,
            });
            // Create a payment record
            await Payment_1.default.create({
                promoteur: promoteur._id,
                amount: session.amount_total,
                currency: session.currency,
                type: 'onboarding',
                status: 'succeeded',
                stripePaymentIntentId: session.payment_intent,
                metadata: session.metadata,
            });
            // Send notification
            await NotificationService_1.NotificationService.create({
                recipient: userId,
                type: 'system',
                title: 'Bienvenue, Promoteur !',
                message: 'Votre paiement a Ã©tÃ© acceptÃ©. Vous Ãªtes maintenant promoteur sur la plateforme. ComplÃ©tez votre profil pour commencer.',
                priority: 'high',
                channels: { inApp: true, email: true },
            });
            console.log(`User ${userId} became promoteur: ${organizationName}`);
        }
        catch (err) {
            console.error('Error processing become-promoteur payment:', err);
        }
        return;
    }
    if (paymentType === 'upgrade') {
        console.log('[âœ… UPGRADE PAYMENT DETECTED] Processing upgrade payment');
        // Handle upgrade payment
        const userId = session.metadata.userId;
        const promoteurId = session.metadata.promoteurId;
        const upgradeTo = session.metadata.upgradeTo;
        const upgradeFrom = session.metadata.upgradeFrom;
        console.log('[UPGRADE WEBHOOK] Processing upgrade payment:', {
            userId,
            promoteurId,
            upgradeFrom,
            upgradeTo,
            sessionId: session.id,
            amount: session.amount_total
        });
        try {
            // Update promoteur plan
            console.log('[UPGRADE WEBHOOK] Finding promoteur with ID:', promoteurId);
            const promoteur = await Promoteur_1.default.findById(promoteurId);
            if (!promoteur) {
                console.error('[âŒ UPGRADE WEBHOOK] Promoteur not found for upgrade:', promoteurId);
                console.error('[âŒ UPGRADE WEBHOOK] Available promoteyurs:', await Promoteur_1.default.find({}).select('_id organizationName plan'));
                return;
            }
            console.log('[UPGRADE WEBHOOK] âœ… Found promoteur:', {
                id: promoteur._id,
                name: promoteur.organizationName,
                currentPlan: promoteur.plan
            });
            console.log('[UPGRADE WEBHOOK] Updating plan from', promoteur.plan, 'to', upgradeTo);
            promoteur.plan = upgradeTo;
            promoteur.subscriptionStatus = 'active';
            // Add payment to history
            promoteur.paymentHistory.push({
                amount: session.amount_total,
                type: 'upgrade',
                status: 'paid',
                date: new Date(),
            });
            await promoteur.save();
            console.log('[âœ… UPGRADE WEBHOOK] Promoteur saved successfully');
            // Verify the update
            const updated = await Promoteur_1.default.findById(promoteurId);
            console.log('[VERIFY] Promoteur after save:', {
                id: updated?._id,
                plan: updated?.plan,
                expectedPlan: upgradeTo
            });
            // Create a payment record
            await Payment_1.default.create({
                promoteur: promoteur._id,
                amount: session.amount_total,
                currency: session.currency,
                type: 'upgrade',
                status: 'succeeded',
                stripePaymentIntentId: session.payment_intent,
                metadata: session.metadata,
            });
            // Check for badges
            const { BadgeService } = await Promise.resolve().then(() => __importStar(require('../services/BadgeService')));
            await BadgeService.checkAndAwardBadges(promoteur._id.toString());
            // Send notification
            await NotificationService_1.NotificationService.create({
                recipient: userId,
                type: 'system',
                title: 'Upgrade rÃ©ussi !',
                message: `Votre plan a Ã©tÃ© mis Ã  jour vers ${upgradeTo}.`,
                priority: 'high',
                channels: { inApp: true, email: true },
            });
            console.log(`[âœ… UPGRADE SUCCESS] Promoteur ${promoteurId} upgraded from ${upgradeFrom} to ${upgradeTo}`);
        }
        catch (err) {
            console.error('[âŒ UPGRADE WEBHOOK ERROR]', err);
            console.error('[âŒ UPGRADE WEBHOOK ERROR] Stack:', err.stack);
        }
        return;
    }
    // If no specific payment type, check if it's a subscription checkout
    if (!paymentType && session.mode === 'subscription') {
        console.log('[CHECKOUT COMPLETED] Processing subscription checkout');
        // ... existing code ...
    }
    if (paymentType === 'boost') {
        // CrÃ©er un enregistrement de paiement pour le boost
        const startDate = new Date();
        const duration = parseInt(session.metadata.duration) || 30;
        const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
        const entityType = session.metadata.entityType || 'project';
        const placement = session.metadata.placement || 'annuaires';
        console.log('[BOOST CREATION] Processing boost type:', entityType);
        console.log('[BOOST CREATION] Placement:', placement);
        if (entityType === 'promoteur') {
            // CrÃ©er un FeaturedSlot pour le profil promoteur
            const { default: FeaturedSlot } = await Promise.resolve().then(() => __importStar(require('../models/FeaturedSlot')));
            const featuredSlot = new (FeaturedSlot)({
                entityType: 'promoteur',
                entity: promoteurId,
                placement,
                startDate,
                endDate,
                status: 'scheduled', // Admin doit approuver
                type: 'paid',
                payment: {
                    amount: session.amount_total,
                    currency: session.currency.toUpperCase(),
                    paidAt: new Date(),
                },
                impressions: 0,
                clicks: 0,
                createdBy: promoteurId,
            });
            await featuredSlot.save();
            console.log(`[âœ… PROMOTEUR FEATURED SLOT CREATED]`, {
                slotId: featuredSlot._id,
                promoteurId,
                placement,
                amount: session.amount_total,
                duration,
            });
            // CrÃ©er un Payment record pour le tracking
            await Payment_1.default.create({
                promoteur: promoteurId,
                amount: session.amount_total,
                currency: session.currency,
                type: 'boost',
                status: 'succeeded',
                approvalStatus: 'pending',
                stripePaymentIntentId: session.payment_intent,
                boostDetails: {
                    projectId: null,
                    entityType: 'promoteur',
                    boostType: session.metadata.boostType,
                    duration,
                    startDate,
                    endDate,
                    featuredSlotId: featuredSlot._id.toString(),
                },
                metadata: session.metadata,
            });
            return;
        }
        if (entityType === 'project') {
            // CrÃ©er un enregistrement de paiement pour le boost projet (existing logic)
            const boostPayment = await Payment_1.default.create({
                promoteur: promoteurId,
                amount: session.amount_total,
                currency: session.currency,
                type: 'boost',
                status: 'succeeded',
                approvalStatus: 'pending',
                stripePaymentIntentId: session.payment_intent,
                boostDetails: {
                    projectId: session.metadata.projectId || null,
                    entityType: 'project',
                    boostType: session.metadata.boostType,
                    duration,
                    startDate,
                    endDate,
                },
                metadata: session.metadata,
            });
            const savedBoost = await Payment_1.default.findById(boostPayment._id);
            console.log('[BOOST VERIFICATION] Boost projet saved in DB with promoteur:', savedBoost?.promoteur);
            console.log(`[âœ… BOOST CREATED] Boost crÃ©Ã© pour promoteur ${promoteurId}`);
            console.log(`[BOOST DETAILS]`, {
                boostId: boostPayment._id,
                promoteurId,
                amount: session.amount_total,
                approvalStatus: boostPayment.approvalStatus,
                projectId: session.metadata.projectId,
                boostType: session.metadata.boostType,
            });
            return;
        }
    }
    if (plan && session.subscription) {
        // Log avant update
        const promoteurBefore = await Promoteur_1.default.findById(promoteurId);
        console.log(`[LOG] [Upgrade] Avant update: promoteurId=${promoteurId}, plan=${promoteurBefore?.plan}, status=${promoteurBefore?.subscriptionStatus}`);
        // RÃ©cupÃ©rer les dÃ©tails de l'abonnement
        const stripeSubscription = await stripe_1.stripe.subscriptions.retrieve(session.subscription);
        console.log('[Stripe webhook] handleCheckoutSessionCompleted:', {
            promoteurId,
            plan,
            subscriptionId: stripeSubscription.id,
            status: stripeSubscription.status,
            metadata: session.metadata,
        });
        // CrÃ©er ou mettre Ã  jour l'abonnement
        const setupFeeAmount = Number(session.metadata.setupFeeAmount) || 0;
        await Subscription_1.default.findOneAndUpdate({ stripeSubscriptionId: stripeSubscription.id }, {
            promoteur: promoteurId,
            plan,
            status: stripeSubscription.status,
            billingInterval: 'year',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: stripeSubscription.items.data[0].price.id,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            setupFeePaid: setupFeeAmount > 0,
            setupFeeAmount,
            metadata: session.metadata,
        }, { upsert: true, new: true });
        // Mettre Ã  jour le promoteur
        const updateResult = await Promoteur_1.default.findByIdAndUpdate(promoteurId, {
            plan,
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date(stripeSubscription.current_period_start * 1000),
            subscriptionEndDate: new Date(stripeSubscription.current_period_end * 1000),
        }, { new: true });
        // Log aprÃ¨s update
        const promoteurAfter = await Promoteur_1.default.findById(promoteurId);
        if (updateResult) {
            console.log(`[LOG] Promoteur ${promoteurId} aprÃ¨s maj: plan=${updateResult.plan}, status=${updateResult.subscriptionStatus}`);
        }
        else {
            console.warn(`[LOG] Echec de maj promoteur ${promoteurId}`);
        }
        console.log(`Abonnement ${plan} activÃ© pour promoteur ${promoteurId}`);
    }
    // Final verification - check total boosts
    const totalBoosts = await Payment_1.default.countDocuments({ type: 'boost', approvalStatus: 'pending' });
    console.log('[handleCheckoutSessionCompleted] FINAL CHECK - Total pending boosts in DB:', totalBoosts);
}
/**
 * GÃ©rer le paiement d'une facture (invoice.paid)
 * UtilisÃ© pour activer le compte promoteur aprÃ¨s paiement inline (Stripe Elements)
 */
async function handleInvoicePaid(invoice) {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId)
        return;
    // Retrieve the subscription to get metadata
    const subscription = await stripe_1.stripe.subscriptions.retrieve(subscriptionId);
    const { paymentType, userId, organizationName, organizationType, plan } = subscription.metadata;
    if (paymentType !== 'become-promoteur' || !userId)
        return;
    // Check if promoteur already exists (avoid duplicates)
    const existingPromoteur = await Promoteur_1.default.findOne({ user: userId });
    if (existingPromoteur) {
        console.log(`Promoteur already exists for user ${userId}, skipping`);
        return;
    }
    try {
        // Add promoteur role to user
        await User_1.default.findByIdAndUpdate(userId, {
            $addToSet: { roles: 'promoteur' },
        });
        // Create Promoteur profile
        const promoteur = new Promoteur_1.default({
            user: userId,
            organizationName,
            organizationType: organizationType || 'individual',
            plan: plan || 'starter',
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date(),
            kycStatus: 'pending',
            onboardingCompleted: false,
            onboardingProgress: 0,
            complianceStatus: 'publie',
            financialProofLevel: 'none',
            trustScore: 10,
            totalProjects: 0,
            activeProjects: 0,
            completedProjects: 0,
            totalLeadsReceived: 0,
            stripeCustomerId: invoice.customer,
            stripeSubscriptionId: subscriptionId,
            paymentHistory: [{
                    amount: invoice.amount_paid,
                    type: 'onboarding',
                    status: 'paid',
                    date: new Date(),
                }],
        });
        await promoteur.save();
        // Link promoteur profile to user
        await User_1.default.findByIdAndUpdate(userId, {
            promoteurProfile: promoteur._id,
        });
        // Create a payment record
        await Payment_1.default.create({
            promoteur: promoteur._id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            type: 'onboarding',
            status: 'succeeded',
            stripePaymentIntentId: invoice.payment_intent,
            metadata: subscription.metadata,
        });
        // Send notification
        await NotificationService_1.NotificationService.create({
            recipient: userId,
            type: 'system',
            title: 'Bienvenue, Promoteur !',
            message: 'Votre paiement a Ã©tÃ© acceptÃ©. Vous Ãªtes maintenant promoteur sur la plateforme.',
            priority: 'high',
            channels: { inApp: true, email: true },
        });
        console.log(`[invoice.paid] User ${userId} became promoteur: ${organizationName}`);
    }
    catch (err) {
        console.error('Error processing invoice.paid for become-promoteur:', err);
    }
}
/**
 * GÃ©rer la mise Ã  jour d'un abonnement
 */
async function handleSubscriptionUpdate(subscription) {
    console.log('[Stripe webhook] handleSubscriptionUpdate:', {
        subscriptionId: subscription.id,
        status: subscription.status,
        metadata: subscription.metadata,
    });
    await Subscription_1.default.findOneAndUpdate({ stripeSubscriptionId: subscription.id }, {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    });
    // Mettre Ã  jour le promoteur
    const sub = await Subscription_1.default.findOne({ stripeSubscriptionId: subscription.id });
    if (sub) {
        const status = subscription.status;
        const promoteurStatus = ['past_due', 'incomplete'].includes(status) ? 'suspended' : status;
        // Ajout log plan
        const promoteur = await Promoteur_1.default.findById(sub.promoteur);
        if (promoteur) {
            console.log(`[LOG] Promoteur avant maj: id=${promoteur._id}, plan=${promoteur.plan}, status=${promoteur.subscriptionStatus}`);
        }
        const updateResult = await Promoteur_1.default.findByIdAndUpdate(sub.promoteur, {
            subscriptionStatus: promoteurStatus,
            subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        }, { new: true });
        console.log('[Stripe webhook] Promoteur update result:', updateResult);
        if (updateResult) {
            console.log(`[LOG] Promoteur ${sub.promoteur} aprÃ¨s maj: plan=${updateResult.plan}, status=${updateResult.subscriptionStatus}`);
        }
        else {
            console.warn(`[LOG] Echec de maj promoteur ${sub.promoteur}`);
        }
        if (['past_due', 'incomplete'].includes(status)) {
            if (promoteur?.user) {
                await NotificationService_1.NotificationService.create({
                    recipient: promoteur.user.toString(),
                    type: 'warning',
                    title: 'Paiement en echec',
                    message: 'Votre abonnement est en echec de paiement. Merci de mettre a jour votre moyen de paiement.',
                    priority: 'urgent',
                    channels: { inApp: true, email: true },
                });
            }
        }
    }
}
/**
 * GÃ©rer la suppression d'un abonnement
 */
async function handleSubscriptionDeleted(subscription) {
    await Subscription_1.default.findOneAndUpdate({ stripeSubscriptionId: subscription.id }, {
        status: 'canceled',
        canceledAt: new Date(),
    });
    const sub = await Subscription_1.default.findOne({ stripeSubscriptionId: subscription.id });
    if (sub) {
        await Promoteur_1.default.findByIdAndUpdate(sub.promoteur, {
            subscriptionStatus: 'expired',
            plan: 'starter', // Retour au plan de base
        });
    }
}
// Payment intent handlers consolidated later in the file
/**
 * RÃ©cupÃ©rer un JWT token aprÃ¨s validation d'une session de boost/payment
 * UtilisÃ© aprÃ¨s la redirection depuis Stripe pour authentifier l'utilisateur
 */
const getTokenFromBoostSession = async (req, res) => {
    try {
        const authUserId = req.user?.id?.toString();
        if (!authUserId) {
            return res.status(401).json({ message: 'Non authentifie' });
        }
        const sessionId = req.query.session_id;
        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID requis' });
        }
        console.log('[getTokenFromBoostSession] RÃ©cupÃ©ration du token pour session:', sessionId);
        // RÃ©cupÃ©rer les dÃ©tails de la session depuis Stripe
        const session = await stripe_1.stripe.checkout.sessions.retrieve(sessionId);
        console.log('[getTokenFromBoostSession] Session Stripe:', {
            id: session.id,
            payment_status: session.payment_status,
            metadata: session.metadata,
        });
        // VÃ©rifier que le paiement est complÃ©tÃ©
        if (session.payment_status !== 'paid') {
            console.warn('[getTokenFromBoostSession] Payment not paid:', session.payment_status);
            return res.status(400).json({
                message: 'Paiement non complÃ©tÃ©',
                status: session.payment_status
            });
        }
        // VÃ©rifier que c'est une session boost valide
        if (session.mode !== 'payment' || session.metadata?.paymentType !== 'boost') {
            return res.status(400).json({ message: 'Session invalide (pas un boost)' });
        }
        // RÃ©cupÃ©rer l'user ID depuis les mÃ©tadatas
        const userId = session.metadata?.userId;
        if (!userId) {
            console.error('[getTokenFromBoostSession] No userId in session metadata');
            return res.status(400).json({ message: 'User ID non trouvÃ© dans la session' });
        }
        if (userId.toString() !== authUserId) {
            return res.status(403).json({ message: 'Session Stripe non autorisee pour cet utilisateur' });
        }
        // RÃ©cupÃ©rer l'utilisateur
        const user = await User_1.default.findById(userId);
        if (!user) {
            console.error('[getTokenFromBoostSession] User not found:', userId);
            return res.status(404).json({ message: 'Utilisateur non trouvÃ©' });
        }
        // Générer un JWT token
        const token = jsonwebtoken_1.default.sign({
            id: user._id.toString(),
            email: user.email,
            roles: user.roles,
            promoteurProfile: user.promoteurProfile,
        }, (0, jwt_1.getJwtSecret)(), { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') });
        console.log('[getTokenFromBoostSession] âœ… Token gÃ©nÃ©rÃ© pour user:', userId);
        res.json({
            token,
            userId: user._id.toString(),
            email: user.email,
            roles: user.roles,
            message: 'Token gÃ©nÃ©rÃ© avec succÃ¨s'
        });
    }
    catch (error) {
        console.error('[getTokenFromBoostSession] Erreur:', error);
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({
                message: 'Session invalide ou expirÃ©e',
                error: error.message
            });
        }
        res.status(500).json({
            message: 'Erreur lors de la rÃ©cupÃ©ration du token',
            error: error.message
        });
    }
};
exports.getTokenFromBoostSession = getTokenFromBoostSession;
/**
 * VÃ©rifier qu'une session de boost a bien Ã©tÃ© complÃ©tÃ©e
 * UtilisÃ© aprÃ¨s la redirection depuis Stripe pour valider le boost
 */
const verifyBoostSession = async (req, res) => {
    try {
        const authUserId = req.user?.id?.toString();
        if (!authUserId) {
            return res.status(401).json({ message: 'Non authentifie' });
        }
        const sessionId = req.query.session_id;
        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID requis' });
        }
        console.log('[verifyBoostSession] VÃ©rification de la session:', sessionId);
        // RÃ©cupÃ©rer les dÃ©tails de la session depuis Stripe
        const session = await stripe_1.stripe.checkout.sessions.retrieve(sessionId);
        console.log('[verifyBoostSession] Session Stripe trouvÃ©e:', {
            id: session.id,
            mode: session.mode,
            payment_status: session.payment_status,
            metadata: session.metadata
        });
        // VÃ©rifier que le paiement est complÃ©tÃ©
        if (session.payment_status !== 'paid') {
            return res.status(400).json({
                message: 'Paiement non complÃ©tÃ©',
                status: session.payment_status
            });
        }
        // VÃ©rifier que c'est un boost (mode payment et metadata paymentType = boost)
        if (session.mode !== 'payment' || session.metadata?.paymentType !== 'boost') {
            return res.status(400).json({
                message: 'Session invalide (pas un boost)'
            });
        }
        if (!session.metadata?.userId || session.metadata.userId.toString() !== authUserId) {
            return res.status(403).json({ message: 'Session Stripe non autorisee pour cet utilisateur' });
        }
        // VÃ©rifier qu'un Payment record existe pour cette session
        const payment = await Payment_1.default.findOne({
            stripePaymentIntentId: session.payment_intent
        });
        if (!payment) {
            console.warn('[verifyBoostSession] Payment record not found for session', sessionId);
            console.log('[verifyBoostSession] Creating payment record as fallback (webhook may not have run)...');
            // FALLBACK: CrÃ©er le payment record si le webhook ne l'a pas fait
            const startDate = new Date();
            const duration = parseInt(session.metadata?.duration) || 30;
            const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
            try {
                const newPayment = await Payment_1.default.create({
                    promoteur: session.metadata?.promoteurId,
                    amount: session.amount_total,
                    currency: session.currency,
                    type: 'boost',
                    status: 'succeeded',
                    approvalStatus: 'pending',
                    stripePaymentIntentId: session.payment_intent,
                    boostDetails: {
                        projectId: session.metadata?.projectId || null,
                        boostType: session.metadata?.boostType || 'custom',
                        duration,
                        startDate,
                        endDate,
                    },
                    metadata: session.metadata,
                });
                console.log('[verifyBoostSession] âœ… Payment record created successfully (fallback):', {
                    paymentId: newPayment._id,
                    promoteurId: newPayment.promoteur,
                    approvalStatus: newPayment.approvalStatus
                });
            }
            catch (err) {
                console.error('[verifyBoostSession] âŒ Failed to create payment record:', err.message);
            }
        }
        else {
            console.log('[verifyBoostSession] âœ… Payment record found');
        }
        res.json({
            valid: true,
            sessionId: session.id,
            amount: session.amount_total,
            currency: session.currency,
            projectId: session.metadata?.projectId,
            message: 'Session de boost valide',
            paymentCreated: !payment // Indicate if we had to create the payment
        });
    }
    catch (error) {
        console.error('[verifyBoostSession] Erreur:', error);
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({
                message: 'Session invalide ou expirÃ©e',
                error: error.message
            });
        }
        res.status(500).json({
            message: 'Erreur lors de la vÃ©rification de la session',
            error: error.message
        });
    }
};
exports.verifyBoostSession = verifyBoostSession;
/**
 * Verifier une session d'upgrade Stripe et appliquer l'upgrade en fallback
 * si le webhook n'a pas encore ete traite (cas frequent en local).
 */
const verifyUpgradeSession = async (req, res) => {
    try {
        const authUserId = req.user?.id?.toString();
        if (!authUserId) {
            return res.status(401).json({ message: 'Non authentifie' });
        }
        const sessionId = req.query.session_id;
        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID requis' });
        }
        const session = await stripe_1.stripe.checkout.sessions.retrieve(sessionId);
        if (session.mode !== 'subscription' || session.metadata?.paymentType !== 'upgrade') {
            return res.status(400).json({ message: "Session invalide (pas un upgrade)" });
        }
        if (!session.metadata?.userId || session.metadata.userId.toString() !== authUserId) {
            return res.status(403).json({ message: 'Session Stripe non autorisee pour cet utilisateur' });
        }
        if (session.payment_status !== 'paid') {
            return res.status(202).json({
                applied: false,
                paymentStatus: session.payment_status,
                message: 'Paiement pas encore finalise',
            });
        }
        const promoteurId = session.metadata?.promoteurId;
        const upgradeToRaw = session.metadata?.upgradeTo;
        const validPlans = ['starter', 'publie', 'verifie', 'partenaire', 'enterprise'];
        const isPromoteurPlan = (value) => validPlans.includes(value);
        if (!promoteurId || !upgradeToRaw) {
            return res.status(400).json({ message: 'Metadata upgrade incomplete' });
        }
        if (!isPromoteurPlan(upgradeToRaw)) {
            return res.status(400).json({ message: 'Plan de destination invalide' });
        }
        const upgradeTo = upgradeToRaw;
        const promoteur = await Promoteur_1.default.findById(promoteurId);
        if (!promoteur) {
            return res.status(404).json({ message: 'Promoteur non trouve' });
        }
        let updated = false;
        if (promoteur.plan !== upgradeTo) {
            promoteur.plan = upgradeTo;
            promoteur.subscriptionStatus = 'active';
            promoteur.paymentHistory.push({
                amount: session.amount_total || 0,
                type: 'upgrade',
                status: 'paid',
                date: new Date(),
            });
            await promoteur.save();
            updated = true;
        }
        const existingPayment = await Payment_1.default.findOne({
            type: 'upgrade',
            promoteur: promoteur._id,
            'metadata.checkoutSessionId': session.id,
        });
        if (!existingPayment) {
            await Payment_1.default.create({
                promoteur: promoteur._id,
                amount: session.amount_total || 0,
                currency: session.currency || 'eur',
                type: 'upgrade',
                status: 'succeeded',
                stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
                metadata: {
                    ...(session.metadata || {}),
                    checkoutSessionId: session.id,
                    source: 'verify-upgrade-session-fallback',
                },
            });
        }
        return res.json({
            applied: true,
            updated,
            plan: upgradeTo,
            message: updated
                ? `Plan mis a jour vers ${upgradeTo}`
                : `Plan deja a jour (${upgradeTo})`,
        });
    }
    catch (error) {
        console.error('[verifyUpgradeSession] Erreur:', error);
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({
                message: 'Session invalide ou expiree',
                error: error.message,
            });
        }
        return res.status(500).json({
            message: "Erreur lors de la verification de l'upgrade",
            error: error.message,
        });
    }
};
exports.verifyUpgradeSession = verifyUpgradeSession;
/**
 * Annuler un abonnement
 */
const cancelSubscription = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Non authentifiÃ©' });
        }
        const promoteur = await Promoteur_1.default.findOne({ user: userId });
        if (!promoteur) {
            return res.status(404).json({ message: 'Promoteur non trouvÃ©' });
        }
        const subscription = await Subscription_1.default.findOne({
            promoteur: promoteur._id,
            status: 'active',
        });
        if (!subscription || !subscription.stripeSubscriptionId) {
            return res.status(404).json({ message: 'Aucun abonnement actif trouvÃ©' });
        }
        // Annuler l'abonnement Ã  la fin de la pÃ©riode
        const canceledSubscription = await stripe_1.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });
        await Subscription_1.default.findByIdAndUpdate(subscription._id, {
            cancelAt: new Date(canceledSubscription.cancel_at * 1000),
        });
        res.json({
            message: 'Abonnement annulÃ©. Restera actif jusqu\'Ã  la fin de la pÃ©riode',
            cancelAt: canceledSubscription.cancel_at
        });
    }
    catch (error) {
        console.error('Erreur annulation abonnement:', error);
        res.status(500).json({ message: 'Erreur lors de l\'annulation', error: error.message });
    }
};
exports.cancelSubscription = cancelSubscription;
/**
 * RÃ©cupÃ©rer l'abonnement actuel
 */
const getCurrentSubscription = async (req, res) => {
    try {
        const userId = req.user?.id;
        console.log('[getCurrentSubscription] userId:', userId);
        if (!userId) {
            console.log('[getCurrentSubscription] Pas de userId dans le token');
            return res.status(401).json({ message: 'Non authentifiÃ©' });
        }
        const promoteur = await Promoteur_1.default.findOne({ user: userId });
        console.log('[getCurrentSubscription] promoteur:', promoteur);
        if (!promoteur) {
            console.log('[getCurrentSubscription] Promoteur non trouvÃ© pour user:', userId);
            return res.status(404).json({ message: 'Promoteur non trouvÃ©' });
        }
        const subscription = await Subscription_1.default.findOne({
            promoteur: promoteur._id,
        }).sort({ createdAt: -1 });
        console.log('[getCurrentSubscription] subscription:', subscription);
        res.json({
            subscription,
            promoteur: {
                plan: promoteur.plan,
                subscriptionStatus: promoteur.subscriptionStatus,
                planChangeRequest: promoteur.planChangeRequest || null,
            },
        });
    }
    catch (error) {
        console.error('[getCurrentSubscription] Erreur rÃ©cupÃ©ration abonnement:', error);
        res.status(500).json({ message: 'Erreur lors de la rÃ©cupÃ©ration', error: error.message });
    }
};
exports.getCurrentSubscription = getCurrentSubscription;
/**
 * RÃ©cupÃ©rer l'historique des paiements
 */
const getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Non authentifiÃ©' });
        }
        const promoteur = await Promoteur_1.default.findOne({ user: userId });
        if (!promoteur) {
            return res.status(404).json({ message: 'Promoteur non trouvÃ©' });
        }
        const payments = await Payment_1.default.find({ promoteur: promoteur._id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ payments });
    }
    catch (error) {
        console.error('Erreur rÃ©cupÃ©ration historique:', error);
        res.status(500).json({ message: 'Erreur lors de la rÃ©cupÃ©ration', error: error.message });
    }
};
exports.getPaymentHistory = getPaymentHistory;
/**
 * GÃ©rer l'Ã©chec d'un payment intent
 */
async function handlePaymentIntentFailed(paymentIntent) {
    // Update payment record status
    await Payment_1.default.findOneAndUpdate({ stripePaymentIntentId: paymentIntent.id }, {
        status: 'failed',
        errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
        errorCode: paymentIntent.last_payment_error?.code,
    });
    console.log('[PAYMENT INTENT FAILED] Processing failed payment intent:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        metadata: paymentIntent.metadata,
        errorMessage: paymentIntent.last_payment_error?.message,
        errorCode: paymentIntent.last_payment_error?.code,
    });
    // Notify user of payment failure
    const userId = paymentIntent.metadata?.userId;
    if (userId) {
        try {
            await NotificationService_1.NotificationService.create({
                recipient: userId,
                type: 'warning',
                title: 'Paiement Ã©chouÃ©',
                message: `Votre paiement de ${paymentIntent.amount / 100}â‚¬ a Ã©chouÃ©. Veuillez rÃ©essayer ou contacter notre support.`,
                priority: 'high',
                channels: { inApp: true, email: true },
            });
        }
        catch (error) {
            console.error('[PAYMENT INTENT FAILED] Failed to create notification:', error);
        }
    }
}
/**
 * GÃ©rer le succÃ¨s d'un payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
    // Update payment record status
    await Payment_1.default.findOneAndUpdate({ stripePaymentIntentId: paymentIntent.id }, {
        status: 'succeeded',
        stripeChargeId: paymentIntent.charges?.data[0]?.id,
        receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
    });
    console.log('[PAYMENT INTENT SUCCEEDED] Processing payment intent:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        metadata: paymentIntent.metadata,
        status: paymentIntent.status
    });
    // Check if this is an upgrade payment
    if (paymentIntent.metadata.paymentType === 'upgrade') {
        const userId = paymentIntent.metadata.userId;
        const promoteurId = paymentIntent.metadata.promoteurId;
        const upgradeTo = paymentIntent.metadata.upgradeTo;
        const upgradeFrom = paymentIntent.metadata.upgradeFrom;
        console.log('[PAYMENT INTENT] Processing upgrade payment:', {
            userId,
            promoteurId,
            upgradeFrom,
            upgradeTo,
            amount: paymentIntent.amount
        });
        try {
            // Update promoteur plan
            const promoteur = await Promoteur_1.default.findById(promoteurId);
            if (!promoteur) {
                console.error('[PAYMENT INTENT] Promoteur not found for upgrade:', promoteurId);
                return;
            }
            console.log('[PAYMENT INTENT] Found promoteur, current plan:', promoteur.plan);
            promoteur.plan = upgradeTo;
            promoteur.subscriptionStatus = 'active';
            // Add payment to history
            promoteur.paymentHistory.push({
                amount: paymentIntent.amount,
                type: 'upgrade',
                status: 'paid',
                date: new Date(),
            });
            await promoteur.save();
            console.log('[PAYMENT INTENT] Promoteur updated successfully to plan:', upgradeTo);
            // Create a payment record
            await Payment_1.default.create({
                promoteur: promoteur._id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                type: 'upgrade',
                status: 'succeeded',
                stripePaymentIntentId: paymentIntent.id,
                metadata: paymentIntent.metadata,
            });
            // Upsert a Subscription record so getCurrentSubscription can find it
            try {
                const stripeSubscriptionId = paymentIntent.metadata.stripeSubscriptionId || paymentIntent.metadata.subscriptionId || null;
                const subscriptionUpsert = {
                    promoteur: promoteur._id,
                    plan: upgradeTo,
                    status: 'active',
                    metadata: paymentIntent.metadata,
                };
                if (stripeSubscriptionId)
                    subscriptionUpsert.stripeSubscriptionId = stripeSubscriptionId;
                // Use provided dates when available in metadata, otherwise leave null
                if (paymentIntent.metadata.currentPeriodStart) {
                    subscriptionUpsert.currentPeriodStart = new Date(parseInt(paymentIntent.metadata.currentPeriodStart) * 1000);
                }
                if (paymentIntent.metadata.currentPeriodEnd) {
                    subscriptionUpsert.currentPeriodEnd = new Date(parseInt(paymentIntent.metadata.currentPeriodEnd) * 1000);
                }
                const subDoc = await Subscription_1.default.findOneAndUpdate({ promoteur: promoteur._id, stripeSubscriptionId: subscriptionUpsert.stripeSubscriptionId || { $exists: false } }, subscriptionUpsert, { upsert: true, new: true });
                // Update promoteur subscription dates/status
                const promoteurUpdate = { plan: upgradeTo, subscriptionStatus: 'active' };
                if (subDoc?.currentPeriodStart)
                    promoteurUpdate.subscriptionStartDate = subDoc.currentPeriodStart;
                if (subDoc?.currentPeriodEnd)
                    promoteurUpdate.subscriptionEndDate = subDoc.currentPeriodEnd;
                await Promoteur_1.default.findByIdAndUpdate(promoteur._id, promoteurUpdate);
                console.log('[PAYMENT INTENT] Upserted Subscription for upgrade:', { promoteurId: promoteur._id.toString(), subscriptionId: subDoc?._id?.toString() });
            }
            catch (err) {
                console.warn('[PAYMENT INTENT] Failed to upsert Subscription for upgrade, continuing:', err.message);
            }
            // Check for badges
            const { BadgeService } = await Promise.resolve().then(() => __importStar(require('../services/BadgeService')));
            await BadgeService.checkAndAwardBadges(promoteur._id.toString());
            // Send notification
            const { NotificationService } = await Promise.resolve().then(() => __importStar(require('../services/NotificationService')));
            await NotificationService.create({
                recipient: userId,
                type: 'system',
                title: 'Upgrade rÃ©ussi !',
                message: `Votre plan a Ã©tÃ© mis Ã  jour vers ${upgradeTo}.`,
                priority: 'high',
                channels: { inApp: true, email: true },
            });
            console.log(`[PAYMENT INTENT] Promoteur ${promoteurId} upgraded from ${upgradeFrom} to ${upgradeTo}`);
        }
        catch (err) {
            console.error('[PAYMENT INTENT] Error processing upgrade payment:', err);
        }
    }
}
/**
 * Lister tous les boosts en attente d'approbation (admin uniquement)
 */
const getPendingBoosts = async (req, res) => {
    try {
        console.log('[getPendingBoosts] RÃ©cupÃ©ration des boosts en attente...');
        const boosts = await Payment_1.default.find({
            type: 'boost',
            status: 'succeeded',
            approvalStatus: 'pending'
        })
            .populate('promoteur', 'organizationName email user')
            .populate('boostDetails.projectId', 'title location')
            .sort({ createdAt: -1 });
        console.log('[getPendingBoosts] Found', boosts.length, 'pending boosts');
        if (boosts.length > 0) {
            console.log('[getPendingBoosts] First boost:', {
                _id: boosts[0]._id,
                promoteur: boosts[0].promoteur,
                projectId: boosts[0].boostDetails?.projectId
            });
        }
        res.json({ boosts });
    }
    catch (error) {
        console.error('[getPendingBoosts] Erreur:', error);
        res.status(500).json({
            message: 'Erreur lors de la rÃ©cupÃ©ration des boosts en attente',
            error: error.message
        });
    }
};
exports.getPendingBoosts = getPendingBoosts;
/**
 * Approuver un boost (admin uniquement)
 */
const approveBoost = async (req, res) => {
    try {
        const { boostId } = req.body;
        if (!boostId) {
            return res.status(400).json({ message: 'Boost ID requis' });
        }
        console.log('[approveBoost] Approbation du boost:', boostId);
        // Trouver le boost
        const boost = await Payment_1.default.findById(boostId)
            .populate('boostDetails.projectId')
            .populate('promoteur');
        if (!boost) {
            return res.status(404).json({ message: 'Boost non trouvÃ©' });
        }
        if (boost.type !== 'boost' || boost.status !== 'succeeded') {
            return res.status(400).json({ message: 'Seuls les boosts payÃ©s peuvent Ãªtre approuvÃ©s' });
        }
        if (boost.approvalStatus === 'approved' || boost.approvalStatus === 'rejected') {
            return res.status(400).json({
                message: 'Ce boost a dÃ©jÃ  Ã©tÃ© traitÃ©',
                currentStatus: boost.approvalStatus
            });
        }
        // Mettre Ã  jour le boost
        boost.approvalStatus = 'approved';
        await boost.save();
        console.log('[approveBoost] âœ… Boost approuvÃ©:', {
            boostId: boost._id,
            projectId: boost.boostDetails?.projectId,
            promoteurId: boost.promoteur?._id
        });
        // Ajouter le boost au projet
        const project = boost.boostDetails?.projectId;
        const projectBoostEntry = {
            paymentId: boost._id,
            type: boost.boostDetails?.boostType,
            startDate: boost.boostDetails?.startDate,
            endDate: boost.boostDetails?.endDate,
            status: 'active'
        };
        if (project) {
            // Ajouter le boost au tableau des boosts actifs du projet
            await Project_1.default.findByIdAndUpdate(project._id, {
                $push: { boosts: projectBoostEntry }
            }, { new: true });
            console.log('[approveBoost] âœ… Boost ajoutÃ© au projet:', {
                projectIdFromDb: project._id,
                boostType: boost.boostDetails?.boostType,
                duration: `${boost.boostDetails?.duration} jours`
            });
        }
        // Notifier le promoteur
        const promoteur = boost.promoteur;
        if (promoteur?.user) {
            try {
                await NotificationService_1.NotificationService.create({
                    recipient: promoteur.user.toString(),
                    type: 'system',
                    title: 'Boost approuvÃ© !',
                    message: `Votre boost pour le projet "${project?.title || 'votre projet'}" a Ã©tÃ© approuvÃ© et est maintenant actif pendant ${boost.boostDetails?.duration || 30} jours.`,
                    priority: 'high',
                    channels: { inApp: true, email: true },
                });
                console.log('[approveBoost] âœ… Notification envoyÃ©e au promoteur:', promoteur.user);
            }
            catch (notifError) {
                console.error('[approveBoost] âš ï¸ Erreur lors de l\'envoi de la notification:', notifError.message);
            }
        }
        res.json({
            message: 'Boost approuvÃ© avec succÃ¨s et appliquÃ© au projet',
            boost
        });
    }
    catch (error) {
        console.error('[approveBoost] Erreur:', error);
        res.status(500).json({
            message: 'Erreur lors de l\'approbation du boost',
            error: error.message
        });
    }
};
exports.approveBoost = approveBoost;
/**
 * Rejeter un boost (admin uniquement)
 */
const rejectBoost = async (req, res) => {
    try {
        const { boostId, reason } = req.body;
        if (!boostId) {
            return res.status(400).json({ message: 'Boost ID requis' });
        }
        console.log('[rejectBoost] Rejet du boost:', boostId, 'avec raison:', reason);
        // Trouver le boost
        const boost = await Payment_1.default.findById(boostId)
            .populate('boostDetails.projectId')
            .populate('promoteur');
        if (!boost) {
            return res.status(404).json({ message: 'Boost non trouvÃ©' });
        }
        if (boost.type !== 'boost' || boost.status !== 'succeeded') {
            return res.status(400).json({ message: 'Seuls les boosts payÃ©s peuvent Ãªtre rejetÃ©s' });
        }
        // Mettre Ã  jour le boost
        boost.approvalStatus = 'rejected';
        boost.metadata = {
            ...(boost.metadata || {}),
            rejectionReason: reason || 'Non spÃ©cifiÃ©e'
        };
        await boost.save();
        console.log('[rejectBoost] âœ… Boost rejetÃ©');
        // Notifier le promoteur
        const project = boost.boostDetails?.projectId;
        const promoteur = boost.promoteur;
        if (promoteur?.user) {
            await NotificationService_1.NotificationService.create({
                recipient: promoteur.user.toString(),
                type: 'warning',
                title: 'Boost rejetÃ©',
                message: `Votre boost pour le projet "${project?.title || 'votre projet'}" a Ã©tÃ© rejetÃ©. Raison: ${reason || 'Non spÃ©cifiÃ©e'}`,
                priority: 'high',
                channels: { inApp: true, email: true },
            });
        }
        res.json({
            message: 'Boost rejetÃ©',
            boost
        });
    }
    catch (error) {
        console.error('[rejectBoost] Erreur:', error);
        res.status(500).json({
            message: 'Erreur lors du rejet du boost',
            error: error.message
        });
    }
};
exports.rejectBoost = rejectBoost;
