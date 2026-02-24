"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientController = void 0;
const Project_1 = __importDefault(require("../models/Project"));
const Favorite_1 = __importDefault(require("../models/Favorite"));
const User_1 = __importDefault(require("../models/User"));
const Report_1 = __importDefault(require("../models/Report"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const Payment_1 = __importDefault(require("../models/Payment"));
const NotificationService_1 = require("../services/NotificationService");
const stripe_1 = require("../config/stripe");
const roles_1 = require("../config/roles");
class ClientController {
    /**
     * Add project to favorites
     */
    static async addFavorite(req, res) {
        try {
            const { projectId } = req.params;
            const { notes, alertOnUpdate, alertOnPriceChange, alertOnStatusChange } = req.body;
            const project = await Project_1.default.findById(projectId);
            if (!project || project.publicationStatus !== 'published') {
                return res.status(404).json({ message: 'Project not found' });
            }
            // Check if already favorited
            const existing = await Favorite_1.default.findOne({
                user: req.user.id,
                project: projectId,
            });
            if (existing) {
                return res.status(400).json({ message: 'Project already in favorites' });
            }
            const favorite = new Favorite_1.default({
                user: req.user.id,
                project: projectId,
                notes,
                alertOnUpdate: alertOnUpdate !== undefined ? alertOnUpdate : true,
                alertOnPriceChange: alertOnPriceChange !== undefined ? alertOnPriceChange : true,
                alertOnStatusChange: alertOnStatusChange !== undefined ? alertOnStatusChange : true,
            });
            await favorite.save();
            // Update project favorites count
            await Project_1.default.findByIdAndUpdate(projectId, {
                $inc: { favorites: 1 },
            });
            res.status(201).json({ favorite });
        }
        catch (error) {
            console.error('Error adding favorite:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Remove project from favorites
     */
    static async removeFavorite(req, res) {
        try {
            const { projectId } = req.params;
            const favorite = await Favorite_1.default.findOneAndDelete({
                user: req.user.id,
                project: projectId,
            });
            if (!favorite) {
                return res.status(404).json({ message: 'Favorite not found' });
            }
            // Update project favorites count
            await Project_1.default.findByIdAndUpdate(projectId, {
                $inc: { favorites: -1 },
            });
            res.json({ message: 'Removed from favorites' });
        }
        catch (error) {
            console.error('Error removing favorite:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get user's favorites
     */
    static async getFavorites(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const favorites = await Favorite_1.default.find({ user: req.user.id })
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
            const total = await Favorite_1.default.countDocuments({ user: req.user.id });
            res.json({
                favorites,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit),
                },
            });
        }
        catch (error) {
            console.error('Error getting favorites:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update favorite settings
     */
    static async updateFavorite(req, res) {
        try {
            const { projectId } = req.params;
            const { notes, alertOnUpdate, alertOnPriceChange, alertOnStatusChange } = req.body;
            const favorite = await Favorite_1.default.findOne({
                user: req.user.id,
                project: projectId,
            });
            if (!favorite) {
                return res.status(404).json({ message: 'Favorite not found' });
            }
            if (notes !== undefined)
                favorite.notes = notes;
            if (alertOnUpdate !== undefined)
                favorite.alertOnUpdate = alertOnUpdate;
            if (alertOnPriceChange !== undefined)
                favorite.alertOnPriceChange = alertOnPriceChange;
            if (alertOnStatusChange !== undefined)
                favorite.alertOnStatusChange = alertOnStatusChange;
            await favorite.save();
            res.json({ favorite });
        }
        catch (error) {
            console.error('Error updating favorite:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Compare projects
     */
    static async compareProjects(req, res) {
        try {
            const { projectIds } = req.query; // Comma-separated project IDs
            if (!projectIds) {
                return res.status(400).json({ message: 'Project IDs required' });
            }
            const ids = projectIds.split(',').slice(0, 3); // Max 3 projects
            const projects = await Project_1.default.find({
                _id: { $in: ids },
                publicationStatus: 'published',
            }).populate('promoteur', 'organizationName trustScore badges plan');
            if (projects.length === 0) {
                return res.status(404).json({ message: 'No projects found' });
            }
            res.json({ projects });
        }
        catch (error) {
            console.error('Error comparing projects:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Report content
     */
    static async reportContent(req, res) {
        try {
            const { targetType, targetId, reason, description, evidence } = req.body;
            const report = new Report_1.default({
                reportedBy: req.user.id,
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
        }
        catch (error) {
            console.error('Error reporting content:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get user notifications
     */
    static async getNotifications(req, res) {
        try {
            const { read, type, page = 1, limit = 20 } = req.query;
            const filters = {
                limit: Number(limit),
                skip: (Number(page) - 1) * Number(limit),
            };
            if (read !== undefined)
                filters.read = read === 'true';
            if (type)
                filters.type = type;
            const result = await NotificationService_1.NotificationService.getUserNotifications(req.user.id, filters);
            res.json({
                ...result,
                pagination: {
                    total: result.total,
                    page: Number(page),
                    pages: Math.ceil(result.total / Number(limit)),
                    limit: Number(limit),
                },
            });
        }
        catch (error) {
            console.error('Error getting notifications:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Mark notification as read
     */
    static async markNotificationRead(req, res) {
        try {
            const { id } = req.params;
            const notification = await NotificationService_1.NotificationService.markAsRead(id, req.user.id);
            if (!notification) {
                return res.status(404).json({ message: 'Notification not found' });
            }
            res.json({ notification });
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Mark all notifications as read
     */
    static async markAllNotificationsRead(req, res) {
        try {
            const result = await NotificationService_1.NotificationService.markAllAsRead(req.user.id);
            res.json({ message: 'All notifications marked as read', count: result.modifiedCount });
        }
        catch (error) {
            console.error('Error marking all notifications as read:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get user profile
     */
    static async getProfile(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Get favorites count
            const favoritesCount = await Favorite_1.default.countDocuments({ user: user._id });
            res.json({ user, stats: { favoritesCount } });
        }
        catch (error) {
            console.error('Error getting profile:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update user profile
     */
    static async updateProfile(req, res) {
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
            const updates = {};
            Object.keys(req.body).forEach(key => {
                if (allowedFields.includes(key)) {
                    updates[key] = req.body[key];
                }
            });
            const user = await User_1.default.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-password');
            res.json({ user });
        }
        catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Search projects (advanced)
     */
    static async searchProjects(req, res) {
        try {
            const { search, country, city, projectType, minPrice, maxPrice, minScore, deliveryBefore, verifiedOnly, featured, sort = '-trustScore', page = 1, limit = 20, } = req.query;
            const query = { publicationStatus: 'published' };
            // Search
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { area: { $regex: search, $options: 'i' } },
                ];
            }
            // Filters
            if (country)
                query.country = country;
            if (city)
                query.city = city;
            if (projectType)
                query.projectType = projectType;
            if (minPrice || maxPrice) {
                query.priceFrom = {};
                if (minPrice)
                    query.priceFrom.$gte = Number(minPrice);
                if (maxPrice)
                    query.priceFrom.$lte = Number(maxPrice);
            }
            if (minScore)
                query.trustScore = { $gte: Number(minScore) };
            if (deliveryBefore) {
                query['timeline.deliveryDate'] = { $lte: new Date(deliveryBefore) };
            }
            if (featured === 'true')
                query.isFeatured = true;
            // Verified only
            if (verifiedOnly === 'true') {
                const verifiedPromoteurs = await Project_1.default.aggregate([
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
                            'promoteurData.plan': { $in: ['standard', 'premium'] },
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
            const projects = await Project_1.default.find(query)
                .sort(sort)
                .limit(Number(limit))
                .skip(skip)
                .populate('promoteur', 'organizationName trustScore badges plan logo')
                .select('-changesLog -moderationNotes');
            const total = await Project_1.default.countDocuments(query);
            res.json({
                projects,
                pagination: {
                    total,
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    limit: Number(limit),
                },
            });
        }
        catch (error) {
            console.error('Error searching projects:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get promoteur application status for the current client
     */
    static async getPromoteurStatus(req, res) {
        try {
            const user = await User_1.default.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Check if user is already a promoteur
            const isPromoteur = user.roles.includes(roles_1.Role.PROMOTEUR);
            if (isPromoteur) {
                const promoteur = await Promoteur_1.default.findOne({ user: user._id });
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
            const pendingPayment = await Payment_1.default.findOne({
                'metadata.userId': user._id.toString(),
                'metadata.paymentType': 'become-promoteur',
                status: 'pending',
            });
            if (pendingPayment) {
                return res.json({ status: 'pending', isPromoteur: false });
            }
            return res.json({ status: 'none', isPromoteur: false });
        }
        catch (error) {
            console.error('Error getting promoteur status:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Create a Stripe Subscription for becoming a promoteur (inline payment, no Checkout redirect)
     * Returns a clientSecret so the frontend can confirm the payment with Stripe Elements.
     */
    static async createBecomePromoteurSession(req, res) {
        try {
            const userId = req.user.id;
            const { organizationName, organizationType, plan, paymentMethodId } = req.body;
            if (!organizationName || !organizationName.trim()) {
                return res.status(400).json({ message: "Le nom de l'organisation est obligatoire" });
            }
            if (!plan || !['basique', 'standard', 'premium'].includes(plan)) {
                return res.status(400).json({ message: 'Plan invalide. Choisissez entre basique, standard ou premium.' });
            }
            if (!paymentMethodId) {
                return res.status(400).json({ message: 'Méthode de paiement requise' });
            }
            const planPrice = stripe_1.BECOME_PROMOTEUR_PRICES[plan];
            const user = await User_1.default.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }
            // Check if user is already a promoteur
            if (user.roles.includes(roles_1.Role.PROMOTEUR)) {
                return res.status(400).json({ message: 'Vous êtes déjà promoteur' });
            }
            // Check if promoteur profile already exists
            const existingPromoteur = await Promoteur_1.default.findOne({ user: userId });
            if (existingPromoteur) {
                return res.status(400).json({ message: 'Un profil promoteur existe déjà pour cet utilisateur' });
            }
            // Create or retrieve Stripe customer
            let stripeCustomerId;
            const existingCustomers = await stripe_1.stripe.customers.list({ email: user.email, limit: 1 });
            if (existingCustomers.data.length > 0) {
                stripeCustomerId = existingCustomers.data[0].id;
            }
            else {
                const customer = await stripe_1.stripe.customers.create({
                    email: user.email,
                    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                    metadata: { userId: userId.toString() },
                });
                stripeCustomerId = customer.id;
            }
            // Attach PaymentMethod to the customer
            await stripe_1.stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
            // Set as default payment method
            await stripe_1.stripe.customers.update(stripeCustomerId, {
                invoice_settings: { default_payment_method: paymentMethodId },
            });
            // Create a Stripe Product + Price (subscriptions API doesn't support inline product_data)
            const product = await stripe_1.stripe.products.create({
                name: `Promoteur - ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
            });
            const price = await stripe_1.stripe.prices.create({
                currency: 'eur',
                product: product.id,
                unit_amount: planPrice,
                recurring: { interval: 'month' },
            });
            // Create the subscription
            const subscription = await stripe_1.stripe.subscriptions.create({
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
            const invoice = subscription.latest_invoice;
            const paymentIntent = invoice?.payment_intent;
            if (!paymentIntent?.client_secret) {
                return res.status(500).json({ message: 'Erreur Stripe : impossible de récupérer le client secret' });
            }
            res.json({
                subscriptionId: subscription.id,
                clientSecret: paymentIntent.client_secret,
            });
        }
        catch (error) {
            console.error('Error creating become-promoteur subscription:', error);
            res.status(500).json({ message: 'Erreur lors de la création de l\'abonnement', error: error.message });
        }
    }
    /**
     * Confirm a become-promoteur payment after Stripe confirmCardPayment succeeds on the frontend.
     * Verifies the subscription status with Stripe and activates the promoteur profile.
     */
    static async confirmBecomePromoteur(req, res) {
        try {
            const userId = req.user.id;
            const { subscriptionId } = req.body;
            if (!subscriptionId) {
                return res.status(400).json({ message: 'subscriptionId requis' });
            }
            // Verify subscription with Stripe
            const subscription = await stripe_1.stripe.subscriptions.retrieve(subscriptionId);
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
            const user = await User_1.default.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }
            if (user.roles.includes(roles_1.Role.PROMOTEUR)) {
                return res.json({ message: 'Déjà promoteur', alreadyPromoteur: true });
            }
            const existingPromoteur = await Promoteur_1.default.findOne({ user: userId });
            if (existingPromoteur) {
                // Profile exists but role missing — fix it
                if (!user.roles.includes(roles_1.Role.PROMOTEUR)) {
                    user.roles.push(roles_1.Role.PROMOTEUR);
                    user.promoteurProfile = existingPromoteur._id;
                    await user.save();
                }
                return res.json({ message: 'Compte promoteur activé', alreadyPromoteur: true });
            }
            const { organizationName, organizationType, plan } = subscription.metadata;
            // Create Promoteur profile
            const promoteur = new Promoteur_1.default({
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
                stripeCustomerId: subscription.customer,
                stripeSubscriptionId: subscription.id,
                paymentHistory: [{
                        amount: stripe_1.BECOME_PROMOTEUR_PRICES[plan] || 2000,
                        type: 'onboarding',
                        status: 'paid',
                        date: new Date(),
                    }],
            });
            await promoteur.save();
            // Update user
            user.roles.push(roles_1.Role.PROMOTEUR);
            user.promoteurProfile = promoteur._id;
            await user.save();
            // Create payment record
            await Payment_1.default.create({
                promoteur: promoteur._id,
                amount: stripe_1.BECOME_PROMOTEUR_PRICES[plan] || 2000,
                currency: 'eur',
                type: 'onboarding',
                status: 'succeeded',
                metadata: subscription.metadata,
            });
            // Notification
            await NotificationService_1.NotificationService.create({
                recipient: userId,
                type: 'system',
                title: 'Bienvenue, Promoteur !',
                message: 'Votre paiement a été accepté. Vous êtes maintenant promoteur sur la plateforme.',
                priority: 'high',
                channels: { inApp: true, email: true },
            });
            console.log(`[confirm] User ${userId} became promoteur: ${organizationName}`);
            res.json({ success: true, message: 'Compte promoteur activé avec succès' });
        }
        catch (error) {
            console.error('Error confirming become-promoteur:', error);
            res.status(500).json({ message: 'Erreur lors de l\'activation du compte promoteur', error: error.message });
        }
    }
}
exports.ClientController = ClientController;
