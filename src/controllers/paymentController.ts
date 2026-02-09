import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe, SUBSCRIPTION_PRICES, BOOST_PRICES } from '../config/stripe';
import Subscription from '../models/Subscription';
import Payment from '../models/Payment';
import Promoteur from '../models/Promoteur';
import User from '../models/User';
import { NotificationService } from '../services/NotificationService';
// ...existing code...
// Exporter explicitement les fonctions publiques à la toute fin du fichier
// (après leur définition effective)

/**
 * Créer une session Checkout pour l'abonnement
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { plan } = req.body; // 'basique', 'standard' ou 'premium'

    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    if (!['basique', 'standard', 'premium'].includes(plan)) {
      return res.status(400).json({ message: 'Plan invalide' });
    }

    // Récupérer le promoteur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const promoteur = await Promoteur.findOne({ user: userId });
    if (!promoteur) {
      return res.status(404).json({ message: 'Promoteur non trouvé' });
    }

    // Créer ou récupérer le customer Stripe
    let stripeCustomerId = promoteur.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: promoteur.organizationName,
        metadata: {
          userId: userId.toString(),
          promoteurId: promoteur._id.toString(),
        },
      });
      stripeCustomerId = customer.id;
      
      // Sauvegarder l'ID customer dans le promoteur
      await Promoteur.findByIdAndUpdate(promoteur._id, {
        stripeCustomerId: stripeCustomerId,
      });
    }

    // Créer la session Checkout
    const promoteurUrl = process.env.PROMOTEUR_URL || 'http://localhost:8081';
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Abonnement ${plan === 'basique' ? 'Basique' : plan === 'standard' ? 'Standard' : 'Premium'}`,
              description: `Plan ${plan} pour promoteur`,
            },
            unit_amount: SUBSCRIPTION_PRICES[plan],
            recurring: {
              interval: 'month',
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
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Erreur création session checkout:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la session', error: error.message });
  }
};

/**
 * Créer une session de paiement pour booster un projet
 */
export const createBoostCheckoutSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, boostType, duration } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    if (!['basic', 'premium', 'enterprise'].includes(boostType)) {
      return res.status(400).json({ message: 'Type de boost invalide' });
    }

    const user = await User.findById(userId);
    const promoteur = await Promoteur.findOne({ user: userId });

    if (!promoteur) {
      return res.status(404).json({ message: 'Promoteur non trouvé' });
    }

    // Créer ou récupérer le customer Stripe
    let stripeCustomerId = promoteur.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user!.email,
        name: promoteur.organizationName,
        metadata: {
          userId: userId.toString(),
          promoteurId: promoteur._id.toString(),
        },
      });
      stripeCustomerId = customer.id;
      
      await Promoteur.findByIdAndUpdate(promoteur._id, {
        stripeCustomerId: stripeCustomerId,
      });
    }

    const amount = BOOST_PRICES[boostType as keyof typeof BOOST_PRICES];

    // Créer la session Checkout
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Boost ${boostType}`,
              description: `Booster votre projet pendant ${duration} jours`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/promoteur/boost/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/promoteur/projects/${projectId}`,
      metadata: {
        userId: userId.toString(),
        promoteurId: promoteur._id.toString(),
        projectId: projectId || '',
        boostType,
        duration: duration?.toString() || '30',
        paymentType: 'boost',
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Erreur création session boost:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la session', error: error.message });
  }
};

/**
 * Webhook Stripe pour gérer les événements
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET non défini');
    return res.status(500).send('Configuration webhook manquante');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Erreur webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
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
        console.log(`Événement non géré: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Erreur traitement webhook:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Gérer la complétion d'une session checkout
 */
async function handleCheckoutSessionCompleted(session: any) {
  const promoteurId = session.metadata.promoteurId;
  const plan = session.metadata.plan;
  const paymentType = session.metadata.paymentType;

  if (paymentType === 'become-promoteur') {
    // Handle become-promoteur payment
    const userId = session.metadata.userId;
    const organizationName = session.metadata.organizationName;
    const organizationType = session.metadata.organizationType || 'individual';
    const selectedPlan = session.metadata.plan || 'basique';

    try {
      // Add promoteur role to user
      await User.findByIdAndUpdate(userId, {
        $addToSet: { roles: 'promoteur' },
      });

      // Create Promoteur profile
      const promoteur = new Promoteur({
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
      await User.findByIdAndUpdate(userId, {
        promoteurProfile: promoteur._id,
      });

      // Create a payment record
      await Payment.create({
        promoteur: promoteur._id,
        amount: session.amount_total,
        currency: session.currency,
        type: 'onboarding',
        status: 'succeeded',
        stripePaymentIntentId: session.payment_intent,
        metadata: session.metadata,
      });

      // Send notification
      await NotificationService.create({
        recipient: userId,
        type: 'system',
        title: 'Bienvenue, Promoteur !',
        message: 'Votre paiement a été accepté. Vous êtes maintenant promoteur sur la plateforme. Complétez votre profil pour commencer.',
        priority: 'high',
        channels: { inApp: true, email: true },
      });

      console.log(`User ${userId} became promoteur: ${organizationName}`);
    } catch (err: any) {
      console.error('Error processing become-promoteur payment:', err);
    }
    return;
  }

  if (paymentType === 'upgrade') {
    console.log('[CHECKOUT COMPLETED] Processing upgrade payment');
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
      const promoteur = await Promoteur.findById(promoteurId);
      if (!promoteur) {
        console.error('[UPGRADE WEBHOOK] Promoteur not found for upgrade:', promoteurId);
        return;
      }

      console.log('[UPGRADE WEBHOOK] Found promoteur, current plan:', promoteur.plan);

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

      console.log('[UPGRADE WEBHOOK] Promoteur updated successfully to plan:', upgradeTo);

      // Create a payment record
      await Payment.create({
        promoteur: promoteur._id,
        amount: session.amount_total,
        currency: session.currency,
        type: 'upgrade',
        status: 'succeeded',
        stripePaymentIntentId: session.payment_intent,
        metadata: session.metadata,
      });

      // Check for badges
      const { BadgeService } = await import('../services/BadgeService');
      await BadgeService.checkAndAwardBadges(promoteur._id.toString());

      // Send notification
      await NotificationService.create({
        recipient: userId,
        type: 'system',
        title: 'Upgrade réussi !',
        message: `Votre plan a été mis à jour vers ${upgradeTo === 'standard' ? 'Standard' : 'Premium'}.`,
        priority: 'high',
        channels: { inApp: true, email: true },
      });

      console.log(`Promoteur ${promoteurId} upgraded from ${upgradeFrom} to ${upgradeTo}`);
    } catch (err: any) {
      console.error('Error processing upgrade payment:', err);
    }
    return;
  }

  // If no specific payment type, check if it's a subscription checkout
  if (!paymentType && session.mode === 'subscription') {
    console.log('[CHECKOUT COMPLETED] Processing subscription checkout');
    // ... existing code ...
  }

  if (paymentType === 'boost') {
    // Créer un enregistrement de paiement pour le boost
    const startDate = new Date();
    const duration = parseInt(session.metadata.duration) || 30;
    const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

    await Payment.create({
      promoteur: promoteurId,
      amount: session.amount_total,
      currency: session.currency,
      type: 'boost',
      status: 'succeeded',
      stripePaymentIntentId: session.payment_intent,
      boostDetails: {
        projectId: session.metadata.projectId || null,
        boostType: session.metadata.boostType,
        duration,
        startDate,
        endDate,
      },
      metadata: session.metadata,
    });

    console.log(`Boost créé pour promoteur ${promoteurId}`);
  }

  if (plan && session.subscription) {
    // Log avant update
    const promoteurBefore = await Promoteur.findById(promoteurId);
    console.log(`[LOG] [Upgrade] Avant update: promoteurId=${promoteurId}, plan=${promoteurBefore?.plan}, status=${promoteurBefore?.subscriptionStatus}`);
    // Récupérer les détails de l'abonnement
    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
    console.log('[Stripe webhook] handleCheckoutSessionCompleted:', {
      promoteurId,
      plan,
      subscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      metadata: session.metadata,
    });
    // Créer ou mettre à jour l'abonnement
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: stripeSubscription.id },
      {
        promoteur: promoteurId,
        plan,
        status: stripeSubscription.status,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
        metadata: session.metadata,
      },
      { upsert: true, new: true }
    );

    // Mettre à jour le promoteur
    const updateResult = await Promoteur.findByIdAndUpdate(promoteurId, {
      plan,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date((stripeSubscription as any).current_period_start * 1000),
      subscriptionEndDate: new Date((stripeSubscription as any).current_period_end * 1000),
    }, { new: true });
    // Log après update
    const promoteurAfter = await Promoteur.findById(promoteurId);
    if (updateResult) {
      console.log(`[LOG] Promoteur ${promoteurId} après maj: plan=${updateResult.plan}, status=${updateResult.subscriptionStatus}`);
    } else {
      console.warn(`[LOG] Echec de maj promoteur ${promoteurId}`);
    }
    console.log(`Abonnement ${plan} activé pour promoteur ${promoteurId}`);
  }
}


/**
 * Gérer le paiement d'une facture (invoice.paid)
 * Utilisé pour activer le compte promoteur après paiement inline (Stripe Elements)
 */
async function handleInvoicePaid(invoice: any) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  // Retrieve the subscription to get metadata
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const { paymentType, userId, organizationName, organizationType, plan } = subscription.metadata;

  if (paymentType !== 'become-promoteur' || !userId) return;

  // Check if promoteur already exists (avoid duplicates)
  const existingPromoteur = await Promoteur.findOne({ user: userId });
  if (existingPromoteur) {
    console.log(`Promoteur already exists for user ${userId}, skipping`);
    return;
  }

  try {
    // Add promoteur role to user
    await User.findByIdAndUpdate(userId, {
      $addToSet: { roles: 'promoteur' },
    });

    // Create Promoteur profile
    const promoteur = new Promoteur({
      user: userId,
      organizationName,
      organizationType: organizationType || 'individual',
      plan: plan || 'basique',
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
    await User.findByIdAndUpdate(userId, {
      promoteurProfile: promoteur._id,
    });

    // Create a payment record
    await Payment.create({
      promoteur: promoteur._id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      type: 'onboarding',
      status: 'succeeded',
      stripePaymentIntentId: invoice.payment_intent,
      metadata: subscription.metadata,
    });

    // Send notification
    await NotificationService.create({
      recipient: userId,
      type: 'system',
      title: 'Bienvenue, Promoteur !',
      message: 'Votre paiement a été accepté. Vous êtes maintenant promoteur sur la plateforme.',
      priority: 'high',
      channels: { inApp: true, email: true },
    });

    console.log(`[invoice.paid] User ${userId} became promoteur: ${organizationName}`);
  } catch (err: any) {
    console.error('Error processing invoice.paid for become-promoteur:', err);
  }
}

/**
 * Gérer la mise à jour d'un abonnement
 */
async function handleSubscriptionUpdate(subscription: any) {
  console.log('[Stripe webhook] handleSubscriptionUpdate:', {
    subscriptionId: subscription.id,
    status: subscription.status,
    metadata: subscription.metadata,
  });
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    }
  );

  // Mettre à jour le promoteur
  const sub = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
  if (sub) {
    const status = subscription.status as string;
    const promoteurStatus = ['past_due', 'incomplete'].includes(status) ? 'suspended' : status;
    // Ajout log plan
    const promoteur = await Promoteur.findById(sub.promoteur);
    if (promoteur) {
      console.log(`[LOG] Promoteur avant maj: id=${promoteur._id}, plan=${promoteur.plan}, status=${promoteur.subscriptionStatus}`);
    }
    const updateResult = await Promoteur.findByIdAndUpdate(sub.promoteur, {
      subscriptionStatus: promoteurStatus,
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    }, { new: true });
    console.log('[Stripe webhook] Promoteur update result:', updateResult);
    if (updateResult) {
      console.log(`[LOG] Promoteur ${sub.promoteur} après maj: plan=${updateResult.plan}, status=${updateResult.subscriptionStatus}`);
    } else {
      console.warn(`[LOG] Echec de maj promoteur ${sub.promoteur}`);
    }

    if (['past_due', 'incomplete'].includes(status)) {
      if (promoteur?.user) {
        await NotificationService.create({
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
 * Gérer la suppression d'un abonnement
 */
async function handleSubscriptionDeleted(subscription: any) {
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      status: 'canceled',
      canceledAt: new Date(),
    }
  );

  const sub = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
  if (sub) {
    await Promoteur.findByIdAndUpdate(sub.promoteur, {
      subscriptionStatus: 'expired',
      plan: 'basique', // Retour au plan de base
    });
  }
}

// Payment intent handlers consolidated later in the file



/**
 * Annuler un abonnement
 */
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const promoteur = await Promoteur.findOne({ user: userId });
    if (!promoteur) {
      return res.status(404).json({ message: 'Promoteur non trouvé' });
    }

    const subscription = await Subscription.findOne({
      promoteur: promoteur._id,
      status: 'active',
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ message: 'Aucun abonnement actif trouvé' });
    }

    // Annuler l'abonnement à la fin de la période
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    await Subscription.findByIdAndUpdate(subscription._id, {
      cancelAt: new Date(canceledSubscription.cancel_at! * 1000),
    });

    res.json({ 
      message: 'Abonnement annulé. Restera actif jusqu\'à la fin de la période', 
      cancelAt: canceledSubscription.cancel_at 
    });
  } catch (error: any) {
    console.error('Erreur annulation abonnement:', error);
    res.status(500).json({ message: 'Erreur lors de l\'annulation', error: error.message });
  }
};

/**
 * Récupérer l'abonnement actuel
 */
export const getCurrentSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    console.log('[getCurrentSubscription] userId:', userId);

    if (!userId) {
      console.log('[getCurrentSubscription] Pas de userId dans le token');
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const promoteur = await Promoteur.findOne({ user: userId });
    console.log('[getCurrentSubscription] promoteur:', promoteur);
    if (!promoteur) {
      console.log('[getCurrentSubscription] Promoteur non trouvé pour user:', userId);
      return res.status(404).json({ message: 'Promoteur non trouvé' });
    }

    const subscription = await Subscription.findOne({
      promoteur: promoteur._id,
    }).sort({ createdAt: -1 });
    console.log('[getCurrentSubscription] subscription:', subscription);

    res.json({ subscription, promoteur: { plan: promoteur.plan, subscriptionStatus: promoteur.subscriptionStatus } });
  } catch (error: any) {
    console.error('[getCurrentSubscription] Erreur récupération abonnement:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
};

/**
 * Récupérer l'historique des paiements
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const promoteur = await Promoteur.findOne({ user: userId });
    if (!promoteur) {
      return res.status(404).json({ message: 'Promoteur non trouvé' });
    }

    const payments = await Payment.find({ promoteur: promoteur._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ payments });
  } catch (error: any) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
};

/**
 * Gérer le succès d'un payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: any) {
  // Update payment record status
  await Payment.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    {
      status: 'succeeded',
      stripeChargeId: paymentIntent.charges?.data[0]?.id,
      receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
    }
  );

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
      const promoteur = await Promoteur.findById(promoteurId);
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
      await Payment.create({
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
        const subscriptionUpsert: any = {
          promoteur: promoteur._id,
          plan: upgradeTo,
          status: 'active',
          metadata: paymentIntent.metadata,
        };
        if (stripeSubscriptionId) subscriptionUpsert.stripeSubscriptionId = stripeSubscriptionId;

        // Use provided dates when available in metadata, otherwise leave null
        if (paymentIntent.metadata.currentPeriodStart) {
          subscriptionUpsert.currentPeriodStart = new Date(parseInt(paymentIntent.metadata.currentPeriodStart) * 1000);
        }
        if (paymentIntent.metadata.currentPeriodEnd) {
          subscriptionUpsert.currentPeriodEnd = new Date(parseInt(paymentIntent.metadata.currentPeriodEnd) * 1000);
        }

        const subDoc = await Subscription.findOneAndUpdate(
          { promoteur: promoteur._id, stripeSubscriptionId: subscriptionUpsert.stripeSubscriptionId || { $exists: false } },
          subscriptionUpsert,
          { upsert: true, new: true }
        );

        // Update promoteur subscription dates/status
        const promoteurUpdate: any = { plan: upgradeTo, subscriptionStatus: 'active' };
        if (subDoc?.currentPeriodStart) promoteurUpdate.subscriptionStartDate = subDoc.currentPeriodStart;
        if (subDoc?.currentPeriodEnd) promoteurUpdate.subscriptionEndDate = subDoc.currentPeriodEnd;

        await Promoteur.findByIdAndUpdate(promoteur._id, promoteurUpdate);
        console.log('[PAYMENT INTENT] Upserted Subscription for upgrade:', { promoteurId: promoteur._id.toString(), subscriptionId: subDoc?._id?.toString() });
      } catch (err: any) {
        console.warn('[PAYMENT INTENT] Failed to upsert Subscription for upgrade, continuing:', err.message);
      }

      // Check for badges
      const { BadgeService } = await import('../services/BadgeService');
      await BadgeService.checkAndAwardBadges(promoteur._id.toString());

      // Send notification
      const { NotificationService } = await import('../services/NotificationService');
      await NotificationService.create({
        recipient: userId,
        type: 'system',
        title: 'Upgrade réussi !',
        message: `Votre plan a été mis à jour vers ${upgradeTo === 'standard' ? 'Standard' : 'Premium'}.`,
        priority: 'high',
        channels: { inApp: true, email: true },
      });

      console.log(`[PAYMENT INTENT] Promoteur ${promoteurId} upgraded from ${upgradeFrom} to ${upgradeTo}`);
    } catch (err: any) {
      console.error('[PAYMENT INTENT] Error processing upgrade payment:', err);
    }
  }
}

/**
 * Gérer l'échec d'un payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: any) {
  // Update payment record status
  await Payment.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntent.id },
    {
      status: 'failed',
      errorMessage: paymentIntent.last_payment_error?.message,
    }
  );

  console.log('[PAYMENT INTENT FAILED] Payment failed:', paymentIntent.id);

  const customerId = paymentIntent.customer;
  if (customerId) {
    const promoteur = await Promoteur.findOne({ stripeCustomerId: customerId });
    if (promoteur?.user) {
      await NotificationService.create({
        recipient: promoteur.user.toString(),
        type: 'warning',
        title: 'Paiement en echec',
        message: 'Votre paiement a echoue. Merci de verifier votre moyen de paiement.',
        priority: 'urgent',
        channels: { inApp: true, email: true },
      });
    }
  }
}

