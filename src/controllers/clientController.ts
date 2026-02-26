import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Project from '../models/Project';
import Favorite from '../models/Favorite';
import User from '../models/User';
import Report from '../models/Report';
import Notification from '../models/Notification';
import Promoteur from '../models/Promoteur';
import Payment from '../models/Payment';
import { NotificationService } from '../services/NotificationService';
import { stripe, BECOME_PROMOTEUR_PRICES, SETUP_FEES } from '../config/stripe';
import { Role } from '../config/roles';

export class ClientController {
  /**
   * Add project to favorites
   */
  static async addFavorite(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const { notes, alertOnUpdate, alertOnPriceChange, alertOnStatusChange } = req.body;

      const project = await Project.findById(projectId);
      if (!project || project.publicationStatus !== 'published') {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check if already favorited
      const existing = await Favorite.findOne({
        user: req.user!.id,
        project: projectId,
      });

      if (existing) {
        return res.status(400).json({ message: 'Project already in favorites' });
      }

      const favorite = new Favorite({
        user: req.user!.id,
        project: projectId,
        notes,
        alertOnUpdate: alertOnUpdate !== undefined ? alertOnUpdate : true,
        alertOnPriceChange: alertOnPriceChange !== undefined ? alertOnPriceChange : true,
        alertOnStatusChange: alertOnStatusChange !== undefined ? alertOnStatusChange : true,
      });

      await favorite.save();

      // Update project favorites count
      await Project.findByIdAndUpdate(projectId, {
        $inc: { favorites: 1 },
      });

      res.status(201).json({ favorite });
    } catch (error) {
      console.error('Error adding favorite:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Remove project from favorites
   */
  static async removeFavorite(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;

      const favorite = await Favorite.findOneAndDelete({
        user: req.user!.id,
        project: projectId,
      });

      if (!favorite) {
        return res.status(404).json({ message: 'Favorite not found' });
      }

      // Update project favorites count
      await Project.findByIdAndUpdate(projectId, {
        $inc: { favorites: -1 },
      });

      res.json({ message: 'Removed from favorites' });
    } catch (error) {
      console.error('Error removing favorite:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get user's favorites
   */
  static async getFavorites(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const favorites = await Favorite.find({ user: req.user!.id })
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .populate({
          path: 'project',
          populate: {
            path: 'promoteur',
            select: 'organizationName trustScore badges',
          },
        });

      const total = await Favorite.countDocuments({ user: req.user!.id });

      res.json({
        favorites,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error getting favorites:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update favorite settings
   */
  static async updateFavorite(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const { notes, alertOnUpdate, alertOnPriceChange, alertOnStatusChange } = req.body;

      const favorite = await Favorite.findOne({
        user: req.user!.id,
        project: projectId,
      });

      if (!favorite) {
        return res.status(404).json({ message: 'Favorite not found' });
      }

      if (notes !== undefined) favorite.notes = notes;
      if (alertOnUpdate !== undefined) favorite.alertOnUpdate = alertOnUpdate;
      if (alertOnPriceChange !== undefined) favorite.alertOnPriceChange = alertOnPriceChange;
      if (alertOnStatusChange !== undefined) favorite.alertOnStatusChange = alertOnStatusChange;

      await favorite.save();

      res.json({ favorite });
    } catch (error) {
      console.error('Error updating favorite:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Compare projects
   */
  static async compareProjects(req: AuthRequest, res: Response) {
    try {
      const { projectIds } = req.query; // Comma-separated project IDs

      if (!projectIds) {
        return res.status(400).json({ message: 'Project IDs required' });
      }

      const ids = (projectIds as string).split(',').slice(0, 3); // Max 3 projects

      const projects = await Project.find({
        _id: { $in: ids },
        publicationStatus: 'published',
      }).populate('promoteur', 'organizationName trustScore badges plan');

      if (projects.length === 0) {
        return res.status(404).json({ message: 'No projects found' });
      }

      res.json({ projects });
    } catch (error) {
      console.error('Error comparing projects:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Report content
   */
  static async reportContent(req: AuthRequest, res: Response) {
    try {
      const { targetType, targetId, reason, description, evidence } = req.body;

      const report = new Report({
        reportedBy: req.user!.id,
        targetType,
        targetId,
        reason,
        description,
        evidence: evidence || [],
        status: 'pending',
        priority: reason === 'fraud' ? 'high' : 'medium',
      });

      await report.save();

      res.status(201).json({ report, message: 'Report submitted successfully' });
    } catch (error) {
      console.error('Error reporting content:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get user notifications
   */
  static async getNotifications(req: AuthRequest, res: Response) {
    try {
      const { read, type, page = 1, limit = 20 } = req.query;

      const filters: any = {
        limit: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
      };

      if (read !== undefined) filters.read = read === 'true';
      if (type) filters.type = type as string;

      const result = await NotificationService.getUserNotifications(
        req.user!.id,
        filters
      );

      res.json({
        ...result,
        pagination: {
          total: result.total,
          page: Number(page),
          pages: Math.ceil(result.total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const notification = await NotificationService.markAsRead(id, req.user!.id);

      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.json({ notification });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsRead(req: AuthRequest, res: Response) {
    try {
      const result = await NotificationService.markAllAsRead(req.user!.id);

      res.json({ message: 'All notifications marked as read', count: result.modifiedCount });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get favorites count
      const favoritesCount = await Favorite.countDocuments({ user: user._id });

      res.json({ user, stats: { favoritesCount } });
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const allowedFields = [
        'firstName',
        'lastName',
        'phone',
        'country',
        'city',
        'avatar',
        'preferences',
        'clientProfile',
      ];

      const updates: any = {};
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      const user = await User.findByIdAndUpdate(
        req.user!.id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      res.json({ user });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Search projects (advanced)
   */
  static async searchProjects(req: AuthRequest, res: Response) {
    try {
      const {
        search,
        country,
        city,
        projectType,
        minPrice,
        maxPrice,
        minScore,
        deliveryBefore,
        verifiedOnly,
        featured,
        sort = '-trustScore',
        page = 1,
        limit = 20,
      } = req.query;

      const query: any = { publicationStatus: 'published' };

      // Search
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { area: { $regex: search, $options: 'i' } },
        ];
      }

      // Filters
      if (country) query.country = country;
      if (city) query.city = city;
      if (projectType) query.projectType = projectType;
      
      if (minPrice || maxPrice) {
        query.priceFrom = {};
        if (minPrice) query.priceFrom.$gte = Number(minPrice);
        if (maxPrice) query.priceFrom.$lte = Number(maxPrice);
      }

      if (minScore) query.trustScore = { $gte: Number(minScore) };

      if (deliveryBefore) {
        query['timeline.deliveryDate'] = { $lte: new Date(deliveryBefore as string) };
      }

      if (featured === 'true') query.isFeatured = true;

      // Verified only
      if (verifiedOnly === 'true') {
        const verifiedPromoteurs = await Project.aggregate([
          {
            $lookup: {
              from: 'promoteurs',
              localField: 'promoteur',
              foreignField: '_id',
              as: 'promoteurData',
            },
          },
          {
            $match: {
              'promoteurData.plan': { $in: ['verifie', 'partenaire', 'enterprise'] },
            },
          },
          {
            $project: { _id: 1 },
          },
        ]);

        const verifiedProjectIds = verifiedPromoteurs.map(p => p._id);
        query._id = { $in: verifiedProjectIds };
      }

      const skip = (Number(page) - 1) * Number(limit);

      const projects = await Project.find(query)
        .sort(sort as string)
        .limit(Number(limit))
        .skip(skip)
        .populate('promoteur', 'organizationName trustScore badges plan logo')
        .select('-changesLog -moderationNotes');

      const total = await Project.countDocuments(query);

      res.json({
        projects,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error searching projects:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Get promoteur application status for the current client
   */
  static async getPromoteurStatus(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user is already a promoteur
      const isPromoteur = user.roles.includes(Role.PROMOTEUR);
      if (isPromoteur) {
        const promoteur = await Promoteur.findOne({ user: user._id });
        return res.json({
          status: 'active',
          isPromoteur: true,
          promoteur: promoteur ? {
            organizationName: promoteur.organizationName,
            plan: promoteur.plan,
            subscriptionStatus: promoteur.subscriptionStatus,
          } : null,
        });
      }

      // Check if there's a pending payment
      const pendingPayment = await Payment.findOne({
        'metadata.userId': user._id.toString(),
        'metadata.paymentType': 'become-promoteur',
        status: 'pending',
      });

      if (pendingPayment) {
        return res.json({ status: 'pending', isPromoteur: false });
      }

      return res.json({ status: 'none', isPromoteur: false });
    } catch (error) {
      console.error('Error getting promoteur status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Create a Stripe Subscription for becoming a promoteur (inline payment, no Checkout redirect)
   * Returns a clientSecret so the frontend can confirm the payment with Stripe Elements.
   */
  static async createBecomePromoteurSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { organizationName, organizationType, plan, paymentMethodId } = req.body;

      if (!organizationName || !organizationName.trim()) {
        return res.status(400).json({ message: "Le nom de l'organisation est obligatoire" });
      }

      if (plan === 'enterprise') {
        return res.status(400).json({ message: 'Le plan Enterprise nécessite de contacter notre équipe commerciale.' });
      }

      if (!plan || !['starter', 'publie', 'verifie', 'partenaire'].includes(plan)) {
        return res.status(400).json({ message: 'Plan invalide. Choisissez entre starter, publie, verifie ou partenaire.' });
      }

      if (!paymentMethodId) {
        return res.status(400).json({ message: 'Méthode de paiement requise' });
      }

      const planPrice = BECOME_PROMOTEUR_PRICES[plan];

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Check if user is already a promoteur
      if (user.roles.includes(Role.PROMOTEUR)) {
        return res.status(400).json({ message: 'Vous êtes déjà promoteur' });
      }

      // Check if promoteur profile already exists
      const existingPromoteur = await Promoteur.findOne({ user: userId });
      if (existingPromoteur) {
        return res.status(400).json({ message: 'Un profil promoteur existe déjà pour cet utilisateur' });
      }

      // Create or retrieve Stripe customer
      let stripeCustomerId: string;
      const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          metadata: { userId: userId.toString() },
        });
        stripeCustomerId = customer.id;
      }

      // Attach PaymentMethod to the customer
      await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });

      // Set as default payment method
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      // Create a Stripe Product + Price (subscriptions API doesn't support inline product_data)
      const product = await stripe.products.create({
        name: `Promoteur - ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
      });

      const price = await stripe.prices.create({
        currency: 'eur',
        product: product.id,
        unit_amount: planPrice,
        recurring: { interval: 'year' },
      });

      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: userId.toString(),
          paymentType: 'become-promoteur',
          organizationName: organizationName.trim(),
          organizationType: organizationType || 'individual',
          plan,
        },
      });

      const invoice = subscription.latest_invoice as any;
      const paymentIntent = invoice?.payment_intent as any;

      if (!paymentIntent?.client_secret) {
        return res.status(500).json({ message: 'Erreur Stripe : impossible de récupérer le client secret' });
      }

      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error('Error creating become-promoteur subscription:', error);
      res.status(500).json({ message: 'Erreur lors de la création de l\'abonnement', error: error.message });
    }
  }

  /**
   * Confirm a become-promoteur payment after Stripe confirmCardPayment succeeds on the frontend.
   * Verifies the subscription status with Stripe and activates the promoteur profile.
   */
  static async confirmBecomePromoteur(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ message: 'subscriptionId requis' });
      }

      // Verify subscription with Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (!subscription || subscription.metadata.paymentType !== 'become-promoteur') {
        return res.status(400).json({ message: 'Abonnement invalide' });
      }

      if (subscription.metadata.userId !== userId.toString()) {
        return res.status(403).json({ message: 'Cet abonnement ne vous appartient pas' });
      }

      // Check that the subscription is active (payment succeeded)
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        return res.status(400).json({ message: `L'abonnement n'est pas actif (statut: ${subscription.status})` });
      }

      // Check if already a promoteur
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      if (user.roles.includes(Role.PROMOTEUR)) {
        return res.json({ message: 'Déjà promoteur', alreadyPromoteur: true });
      }

      const existingPromoteur = await Promoteur.findOne({ user: userId });
      if (existingPromoteur) {
        // Profile exists but role missing — fix it
        if (!user.roles.includes(Role.PROMOTEUR)) {
          user.roles.push(Role.PROMOTEUR as any);
          user.promoteurProfile = existingPromoteur._id as any;
          await user.save();
        }
        return res.json({ message: 'Compte promoteur activé', alreadyPromoteur: true });
      }

      const { organizationName, organizationType, plan } = subscription.metadata;

      // Create Promoteur profile
      const promoteur = new Promoteur({
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
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        paymentHistory: [{
          amount: BECOME_PROMOTEUR_PRICES[plan] || 2000,
          type: 'onboarding',
          status: 'paid',
          date: new Date(),
        }],
      });

      await promoteur.save();

      // Update user
      user.roles.push(Role.PROMOTEUR as any);
      user.promoteurProfile = promoteur._id as any;
      await user.save();

      // Create payment record
      await Payment.create({
        promoteur: promoteur._id,
        amount: BECOME_PROMOTEUR_PRICES[plan] || 2000,
        currency: 'eur',
        type: 'onboarding',
        status: 'succeeded',
        metadata: subscription.metadata,
      });

      // Notification
      await NotificationService.create({
        recipient: userId,
        type: 'system',
        title: 'Bienvenue, Promoteur !',
        message: 'Votre paiement a été accepté. Vous êtes maintenant promoteur sur la plateforme.',
        priority: 'high',
        channels: { inApp: true, email: true },
      });

      console.log(`[confirm] User ${userId} became promoteur: ${organizationName}`);
      res.json({ success: true, message: 'Compte promoteur activé avec succès' });
    } catch (error: any) {
      console.error('Error confirming become-promoteur:', error);
      res.status(500).json({ message: 'Erreur lors de l\'activation du compte promoteur', error: error.message });
    }
  }

  /**
   * Créer une session Stripe Checkout pour devenir promoteur
   * POST /api/client/become-promoteur-checkout
   * Body: { plan, organizationName, organizationType? }
   * Retourne { url } pour rediriger vers Stripe Checkout
   */
  static async createBecomePromoteurCheckout(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { plan, organizationName, organizationType } = req.body;

      if (!plan || !['starter', 'publie', 'verifie', 'partenaire'].includes(plan)) {
        return res.status(400).json({ message: 'Plan invalide' });
      }
      if (!organizationName?.trim()) {
        return res.status(400).json({ message: "Le nom de l'organisation est obligatoire" });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      if (user.roles?.includes(Role.PROMOTEUR)) {
        return res.status(400).json({ message: 'Vous êtes déjà promoteur' });
      }

      const existingPromoteur = await Promoteur.findOne({ user: userId });
      if (existingPromoteur) {
        return res.status(400).json({ message: 'Un profil promoteur existe déjà pour cet utilisateur' });
      }

      // Réutiliser le customer Stripe existant ou en créer un
      let stripeCustomerId: string;
      const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name: organizationName.trim(),
          metadata: { userId: userId.toString() },
        });
        stripeCustomerId = customer.id;
      }

      const planLabels: Record<string, string> = {
        starter: 'Starter', publie: 'Publié', verifie: 'Vérifié', partenaire: 'Partenaire',
      };

      const planPrice = BECOME_PROMOTEUR_PRICES[plan];
      const setupFee = SETUP_FEES[plan] || 0;

      const lineItems: any[] = [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Abonnement ${planLabels[plan]} — First Immo`,
            description: `Plan ${plan} — facturation annuelle`,
          },
          unit_amount: planPrice,
          recurring: { interval: 'year' },
        },
        quantity: 1,
      }];

      if (setupFee > 0) {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: { name: `Frais de mise en place — Plan ${planLabels[plan]}` },
            unit_amount: setupFee,
          },
          quantity: 1,
        });
      }

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:8083';

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: lineItems,
        success_url: `${clientUrl}/devenir-promoteur?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
        cancel_url: `${clientUrl}/devenir-promoteur?canceled=true`,
        metadata: {
          userId: userId.toString(),
          paymentType: 'become-promoteur',
          plan,
          organizationName: organizationName.trim(),
          organizationType: organizationType || 'individual',
        },
      });

      console.log(`[become-promoteur-checkout] Session created for user ${userId}, plan ${plan}`);
      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error('Error creating become-promoteur checkout:', error);
      res.status(500).json({ message: 'Erreur lors de la création de la session', error: error.message });
    }
  }

  /**
   * Vérifier une session Stripe Checkout "become-promoteur" et activer le compte si nécessaire
   * GET /api/client/verify-become-promoteur-session?session_id=...
   * Fallback si le webhook n'a pas encore activé le compte
   */
  static async verifyBecomePromoteurSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const sessionId = req.query.session_id as string;

      if (!sessionId) return res.status(400).json({ message: 'session_id requis' });

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.metadata?.paymentType !== 'become-promoteur') {
        return res.status(400).json({ message: 'Session invalide (pas une session become-promoteur)' });
      }
      if (session.metadata.userId !== userId.toString()) {
        return res.status(403).json({ message: 'Session non autorisée pour cet utilisateur' });
      }
      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        return res.status(400).json({ message: 'Paiement non complété', status: session.payment_status });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      // Si déjà activé par le webhook, retourner directement
      if (user.roles?.includes(Role.PROMOTEUR)) {
        return res.json({ success: true, alreadyActivated: true });
      }

      const existingPromoteur = await Promoteur.findOne({ user: userId });
      if (existingPromoteur) {
        // Profil existe mais rôle manquant — corriger
        user.roles.push(Role.PROMOTEUR as any);
        user.promoteurProfile = existingPromoteur._id as any;
        await user.save();
        return res.json({ success: true, alreadyActivated: true });
      }

      // Fallback : activer manuellement si le webhook n'a pas encore tourné
      const { plan, organizationName, organizationType } = session.metadata!;

      const promoteur = new Promoteur({
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
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        paymentHistory: [{
          amount: BECOME_PROMOTEUR_PRICES[plan] || 60000,
          type: 'onboarding',
          status: 'paid',
          date: new Date(),
        }],
      });

      await promoteur.save();

      user.roles.push(Role.PROMOTEUR as any);
      user.promoteurProfile = promoteur._id as any;
      await user.save();

      await Payment.create({
        promoteur: promoteur._id,
        amount: BECOME_PROMOTEUR_PRICES[plan] || 60000,
        currency: 'eur',
        type: 'onboarding',
        status: 'succeeded',
        metadata: session.metadata,
      });

      await NotificationService.create({
        recipient: userId,
        type: 'system',
        title: 'Bienvenue, Promoteur !',
        message: `Votre paiement a été accepté. Vous êtes maintenant promoteur sur la plateforme (plan ${plan}).`,
        priority: 'high',
        channels: { inApp: true, email: true },
      });

      console.log(`[verify-become-promoteur] User ${userId} activated as promoteur: ${organizationName} (plan ${plan})`);
      res.json({ success: true, alreadyActivated: false, plan });
    } catch (error: any) {
      console.error('Error verifying become-promoteur session:', error);
      if (error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({ message: 'Session Stripe invalide ou expirée', error: error.message });
      }
      res.status(500).json({ message: 'Erreur lors de la vérification de la session', error: error.message });
    }
  }
}
