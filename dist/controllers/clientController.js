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
const Review_1 = __importDefault(require("../models/Review"));
const Appointment_1 = __importDefault(require("../models/Appointment"));
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
            const user = await User_1.default.findById(req.user.id).select('-password').lean();
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Transform user data into ClientProfile format
            const clientProfile = {
                _id: user._id,
                userId: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                address: user.clientProfile?.address,
                residence: user.clientProfile?.residence,
                objectif: user.clientProfile?.objectif,
                modePaiement: user.clientProfile?.modePaiement,
                dejaInvesti: user.clientProfile?.dejaInvesti,
                aversionRisque: user.clientProfile?.aversionRisque,
                accompagnements: user.clientProfile?.accompagnements,
            };
            res.json(clientProfile);
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
            const allowedRootFields = [
                'firstName',
                'lastName',
                'phone',
                'country',
                'city',
                'avatar',
                'preferences',
            ];
            const allowedClientProfileFields = [
                'address',
                'residence',
                'objectif',
                'modePaiement',
                'dejaInvesti',
                'aversionRisque',
                'accompagnements',
                'budget',
                'projectType',
                'preferredCountries',
                'preferredCities',
                'deliveryTimeline',
            ];
            const updates = {};
            const clientProfileUpdates = {};
            Object.keys(req.body).forEach(key => {
                if (allowedRootFields.includes(key)) {
                    updates[key] = req.body[key];
                }
                else if (allowedClientProfileFields.includes(key)) {
                    clientProfileUpdates[key] = req.body[key];
                }
                else if (key === 'clientProfile' && typeof req.body[key] === 'object') {
                    // Handle nested clientProfile object
                    Object.keys(req.body[key]).forEach(nestedKey => {
                        if (allowedClientProfileFields.includes(nestedKey)) {
                            clientProfileUpdates[nestedKey] = req.body[key][nestedKey];
                        }
                    });
                }
            });
            // Add clientProfile updates to the main updates object
            if (Object.keys(clientProfileUpdates).length > 0) {
                updates.clientProfile = clientProfileUpdates;
            }
            const user = await User_1.default.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-password').lean();
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Transform user data into ClientProfile format
            const clientProfile = {
                _id: user._id,
                userId: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                address: user.clientProfile?.address,
                residence: user.clientProfile?.residence,
                objectif: user.clientProfile?.objectif,
                modePaiement: user.clientProfile?.modePaiement,
                dejaInvesti: user.clientProfile?.dejaInvesti,
                aversionRisque: user.clientProfile?.aversionRisque,
                accompagnements: user.clientProfile?.accompagnements,
            };
            res.json(clientProfile);
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
            // Niveau 3 : tri choisi par l'utilisateur (prix, date, score)
            const userSortMap = {
                '-trustScore': { trustScore: -1 },
                '-createdAt': { createdAt: -1 },
                'priceFrom': { priceFrom: 1 },
                '-priceFrom': { priceFrom: -1 },
                'timeline.deliveryDate': { 'timeline.deliveryDate': 1 },
            };
            const userSort = userSortMap[sort] ?? { trustScore: -1 };
            // Poids par plan (niveau 2)
            const planWeightExpr = {
                $switch: {
                    branches: [
                        { case: { $eq: [{ $arrayElemAt: ['$_promoteurArr.plan', 0] }, 'enterprise'] }, then: 4 },
                        { case: { $eq: [{ $arrayElemAt: ['$_promoteurArr.plan', 0] }, 'partenaire'] }, then: 3 },
                        { case: { $eq: [{ $arrayElemAt: ['$_promoteurArr.plan', 0] }, 'verifie'] }, then: 2 },
                        { case: { $eq: [{ $arrayElemAt: ['$_promoteurArr.plan', 0] }, 'publie'] }, then: 1 },
                    ],
                    default: 0,
                },
            };
            // Filtres de base ($match initial)
            const matchStage = { publicationStatus: 'published' };
            if (search) {
                matchStage.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { area: { $regex: search, $options: 'i' } },
                    { city: { $regex: search, $options: 'i' } },
                    { country: { $regex: search, $options: 'i' } },
                ];
            }
            if (country)
                matchStage.country = { $regex: `^${country}$`, $options: 'i' };
            if (city)
                matchStage.city = { $regex: `^${city}$`, $options: 'i' };
            if (projectType)
                matchStage.projectType = projectType;
            if (featured === 'true')
                matchStage.isFeatured = true;
            if (minScore)
                matchStage.trustScore = { $gte: Number(minScore) };
            if (deliveryBefore)
                matchStage['timeline.deliveryDate'] = { $lte: new Date(deliveryBefore) };
            if (minPrice || maxPrice) {
                matchStage.priceFrom = {};
                if (minPrice)
                    matchStage.priceFrom.$gte = Number(minPrice);
                if (maxPrice)
                    matchStage.priceFrom.$lte = Number(maxPrice);
            }
            // Étapes communes au pipeline count et data
            const sharedStages = [
                { $match: matchStage },
                // Lookup promoteur pour planWeight + verifiedOnly
                {
                    $lookup: {
                        from: 'promoteurs',
                        localField: 'promoteur',
                        foreignField: '_id',
                        as: '_promoteurArr',
                    },
                },
                // Filtre verifiedOnly inline (pas de pre-query séparé)
                ...(verifiedOnly === 'true'
                    ? [{ $match: { '_promoteurArr.plan': { $in: ['verifie', 'partenaire', 'enterprise'] } } }]
                    : []),
                // Calcul du poids plan + normalisation isFeatured
                {
                    $addFields: {
                        isFeatured: { $ifNull: ['$isFeatured', false] },
                        _planWeight: planWeightExpr,
                    },
                },
                // Tri : niveau 1 isFeatured, niveau 2 plan, niveau 3 choix user
                {
                    $sort: {
                        isFeatured: -1,
                        _planWeight: -1,
                        ...userSort,
                    },
                },
            ];
            const skip = (Number(page) - 1) * Number(limit);
            // Pipeline count (léger)
            const countPipeline = [...sharedStages, { $count: 'total' }];
            // Pipeline data (paginé + reshape du promoteur)
            const dataPipeline = [
                ...sharedStages,
                { $skip: skip },
                { $limit: Number(limit) },
                // Remplacer promoteur (ObjectId) par les champs utiles du lookup
                {
                    $addFields: {
                        promoteur: {
                            $let: {
                                vars: { p: { $ifNull: [{ $arrayElemAt: ['$_promoteurArr', 0] }, {}] } },
                                in: {
                                    _id: '$$p._id',
                                    organizationName: { $ifNull: ['$$p.organizationName', null] },
                                    trustScore: { $ifNull: ['$$p.trustScore', 0] },
                                    plan: { $ifNull: ['$$p.plan', 'starter'] },
                                    logo: { $ifNull: ['$$p.logo', null] },
                                    badges: { $ifNull: ['$$p.badges', []] },
                                },
                            },
                        },
                    },
                },
                // Supprimer les champs internes / sensibles
                { $unset: ['_promoteurArr', '_planWeight', 'changesLog', 'moderationNotes'] },
            ];
            const [countResult, projects] = await Promise.all([
                Project_1.default.aggregate(countPipeline),
                Project_1.default.aggregate(dataPipeline),
            ]);
            const total = countResult[0]?.total ?? 0;
            // Agrégation des notes moyennes (reviews publiées)
            const projectIds = projects.map((p) => p._id);
            const ratings = await Review_1.default.aggregate([
                { $match: { project: { $in: projectIds }, status: 'published' } },
                { $group: { _id: '$project', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
            ]);
            const ratingMap = new Map(ratings.map((r) => [r._id.toString(), r]));
            const projectsWithRating = projects.map((p) => {
                const r = ratingMap.get(p._id.toString());
                return {
                    ...p,
                    avgRating: r ? Math.round(r.avgRating * 10) / 10 : null,
                    reviewCount: r?.reviewCount ?? 0,
                };
            });
            res.json({
                projects: projectsWithRating,
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
            if (plan === 'enterprise') {
                return res.status(400).json({ message: 'Le plan Enterprise nécessite de contacter notre équipe commerciale.' });
            }
            if (!plan || !['starter', 'publie', 'verifie', 'partenaire'].includes(plan)) {
                return res.status(400).json({ message: 'Plan invalide. Choisissez entre starter, publie, verifie ou partenaire.' });
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
                recurring: { interval: 'year' },
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
    /**
     * Créer une session Stripe Checkout pour devenir promoteur
     * POST /api/client/become-promoteur-checkout
     * Body: { plan, organizationName, organizationType? }
     * Retourne { url } pour rediriger vers Stripe Checkout
     */
    static async createBecomePromoteurCheckout(req, res) {
        try {
            const userId = req.user.id;
            const { plan, organizationName, organizationType } = req.body;
            if (!plan || !['starter', 'publie', 'verifie', 'partenaire'].includes(plan)) {
                return res.status(400).json({ message: 'Plan invalide' });
            }
            if (!organizationName?.trim()) {
                return res.status(400).json({ message: "Le nom de l'organisation est obligatoire" });
            }
            const user = await User_1.default.findById(userId);
            if (!user)
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            if (user.roles?.includes(roles_1.Role.PROMOTEUR)) {
                return res.status(400).json({ message: 'Vous êtes déjà promoteur' });
            }
            const existingPromoteur = await Promoteur_1.default.findOne({ user: userId });
            if (existingPromoteur) {
                return res.status(400).json({ message: 'Un profil promoteur existe déjà pour cet utilisateur' });
            }
            // Réutiliser le customer Stripe existant ou en créer un
            let stripeCustomerId;
            const existingCustomers = await stripe_1.stripe.customers.list({ email: user.email, limit: 1 });
            if (existingCustomers.data.length > 0) {
                stripeCustomerId = existingCustomers.data[0].id;
            }
            else {
                const customer = await stripe_1.stripe.customers.create({
                    email: user.email,
                    name: organizationName.trim(),
                    metadata: { userId: userId.toString() },
                });
                stripeCustomerId = customer.id;
            }
            const planLabels = {
                starter: 'Starter', publie: 'Publié', verifie: 'Vérifié', partenaire: 'Partenaire',
            };
            const planPrice = stripe_1.BECOME_PROMOTEUR_PRICES[plan];
            const setupFee = stripe_1.SETUP_FEES[plan] || 0;
            const lineItems = [{
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
            const session = await stripe_1.stripe.checkout.sessions.create({
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
        }
        catch (error) {
            console.error('Error creating become-promoteur checkout:', error);
            res.status(500).json({ message: 'Erreur lors de la création de la session', error: error.message });
        }
    }
    /**
     * Vérifier une session Stripe Checkout "become-promoteur" et activer le compte si nécessaire
     * GET /api/client/verify-become-promoteur-session?session_id=...
     * Fallback si le webhook n'a pas encore activé le compte
     */
    static async verifyBecomePromoteurSession(req, res) {
        try {
            const userId = req.user.id;
            const sessionId = req.query.session_id;
            if (!sessionId)
                return res.status(400).json({ message: 'session_id requis' });
            const session = await stripe_1.stripe.checkout.sessions.retrieve(sessionId);
            if (session.metadata?.paymentType !== 'become-promoteur') {
                return res.status(400).json({ message: 'Session invalide (pas une session become-promoteur)' });
            }
            if (session.metadata.userId !== userId.toString()) {
                return res.status(403).json({ message: 'Session non autorisée pour cet utilisateur' });
            }
            if (session.payment_status !== 'paid' && session.status !== 'complete') {
                return res.status(400).json({ message: 'Paiement non complété', status: session.payment_status });
            }
            const user = await User_1.default.findById(userId);
            if (!user)
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            // Si déjà activé par le webhook, retourner directement
            if (user.roles?.includes(roles_1.Role.PROMOTEUR)) {
                return res.json({ success: true, alreadyActivated: true });
            }
            const existingPromoteur = await Promoteur_1.default.findOne({ user: userId });
            if (existingPromoteur) {
                // Profil existe mais rôle manquant — corriger
                user.roles.push(roles_1.Role.PROMOTEUR);
                user.promoteurProfile = existingPromoteur._id;
                await user.save();
                return res.json({ success: true, alreadyActivated: true });
            }
            // Fallback : activer manuellement si le webhook n'a pas encore tourné
            const { plan, organizationName, organizationType } = session.metadata;
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
                stripeCustomerId: session.customer,
                stripeSubscriptionId: session.subscription,
                paymentHistory: [{
                        amount: stripe_1.BECOME_PROMOTEUR_PRICES[plan] || 60000,
                        type: 'onboarding',
                        status: 'paid',
                        date: new Date(),
                    }],
            });
            await promoteur.save();
            user.roles.push(roles_1.Role.PROMOTEUR);
            user.promoteurProfile = promoteur._id;
            await user.save();
            await Payment_1.default.create({
                promoteur: promoteur._id,
                amount: stripe_1.BECOME_PROMOTEUR_PRICES[plan] || 60000,
                currency: 'eur',
                type: 'onboarding',
                status: 'succeeded',
                metadata: session.metadata,
            });
            await NotificationService_1.NotificationService.create({
                recipient: userId,
                type: 'system',
                title: 'Bienvenue, Promoteur !',
                message: `Votre paiement a été accepté. Vous êtes maintenant promoteur sur la plateforme (plan ${plan}).`,
                priority: 'high',
                channels: { inApp: true, email: true },
            });
            console.log(`[verify-become-promoteur] User ${userId} activated as promoteur: ${organizationName} (plan ${plan})`);
            res.json({ success: true, alreadyActivated: false, plan });
        }
        catch (error) {
            console.error('Error verifying become-promoteur session:', error);
            if (error.type === 'StripeInvalidRequestError') {
                return res.status(400).json({ message: 'Session Stripe invalide ou expirée', error: error.message });
            }
            res.status(500).json({ message: 'Erreur lors de la vérification de la session', error: error.message });
        }
    }
    /**
     * Get all appointments for the current client (created by them)
     */
    static async getMyAppointments(req, res) {
        try {
            const appointments = await Appointment_1.default.find({ createdBy: req.user.id })
                .populate('project', 'title city area')
                .populate('promoteur', 'organizationName')
                .sort({ scheduledAt: -1 });
            res.json({ appointments });
        }
        catch (error) {
            console.error('Error fetching client appointments:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Cancel an appointment owned by the current client
     */
    static async cancelMyAppointment(req, res) {
        try {
            const { id } = req.params;
            const appointment = await Appointment_1.default.findOne({ _id: id, createdBy: req.user.id });
            if (!appointment) {
                return res.status(404).json({ message: 'Rendez-vous introuvable' });
            }
            if (['canceled', 'completed'].includes(appointment.status)) {
                return res.status(400).json({ message: 'Ce rendez-vous ne peut pas être annulé' });
            }
            appointment.status = 'canceled';
            await appointment.save();
            res.json({ message: 'Rendez-vous annulé', appointment });
        }
        catch (error) {
            console.error('Error cancelling appointment:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Upload avatar for client
     */
    static async uploadAvatar(req, res) {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ message: 'No file provided' });
            }
            try {
                // Try to upload to Cloudinary if configured
                const cloudinary = require('cloudinary').v2;
                if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
                    cloudinary.config({
                        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                        api_key: process.env.CLOUDINARY_API_KEY,
                        api_secret: process.env.CLOUDINARY_API_SECRET,
                    });
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: 'client-avatars',
                        public_id: `${req.user?.id}-avatar`,
                        overwrite: true,
                    });
                    // Delete local temp file
                    const fs = require('fs').promises;
                    try {
                        await fs.unlink(file.path);
                    }
                    catch (e) {
                        // Ignore error if file can't be deleted
                    }
                    // Update user avatar in database
                    const user = await User_1.default.findByIdAndUpdate(req.user.id, { avatar: result.secure_url }, { new: true, runValidators: true }).select('-password').lean();
                    if (!user) {
                        return res.status(404).json({ message: 'User not found' });
                    }
                    return res.json({ avatar: result.secure_url });
                }
            }
            catch (cloudinaryError) {
                console.warn('Cloudinary upload failed, falling back to local storage:', cloudinaryError);
            }
            // Fallback to local storage
            const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
            const avatarUrl = `${backendUrl}/uploads/avatars/${file.filename}`;
            // Update user avatar in database
            const user = await User_1.default.findByIdAndUpdate(req.user.id, { avatar: avatarUrl }, { new: true, runValidators: true }).select('-password').lean();
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({ avatar: avatarUrl });
        }
        catch (error) {
            console.error('Error uploading avatar:', error);
            res.status(500).json({ message: 'Server error during avatar upload' });
        }
    }
}
exports.ClientController = ClientController;
