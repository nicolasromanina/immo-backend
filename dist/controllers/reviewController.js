"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderateReview = exports.deleteReview = exports.updateReview = exports.getMyReviews = exports.getProjectReviews = exports.createReview = void 0;
const Review_1 = __importDefault(require("../models/Review"));
const Project_1 = __importDefault(require("../models/Project"));
/**
 * POST /api/reviews
 * Client crée un review (1 review par projet max)
 */
const createReview = async (req, res) => {
    try {
        const clientId = req.user?.id;
        if (!clientId)
            return res.status(401).json({ message: 'Non authentifié' });
        const { projectId, rating, comment } = req.body;
        if (!projectId || !rating)
            return res.status(400).json({ message: 'projectId et rating requis' });
        if (rating < 1 || rating > 5)
            return res.status(400).json({ message: 'Rating entre 1 et 5' });
        const project = await Project_1.default.findById(projectId).select('promoteur');
        if (!project)
            return res.status(404).json({ message: 'Projet non trouvé' });
        const existing = await Review_1.default.findOne({ client: clientId, project: projectId });
        if (existing)
            return res.status(400).json({ message: 'Vous avez déjà laissé un avis pour ce projet' });
        const review = new Review_1.default({
            client: clientId,
            project: projectId,
            promoteur: project.promoteur,
            rating,
            comment,
        });
        await review.save();
        return res.status(201).json({ review });
    }
    catch (error) {
        if (error.code === 11000)
            return res.status(400).json({ message: 'Vous avez déjà laissé un avis pour ce projet' });
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
exports.createReview = createReview;
/**
 * GET /api/reviews/project/:projectId
 * Reviews publics d'un projet
 */
const getProjectReviews = async (req, res) => {
    try {
        const { projectId } = req.params;
        const reviews = await Review_1.default.find({ project: projectId, status: 'published' })
            .populate('client', 'firstName lastName email')
            .sort({ createdAt: -1 });
        const averageRating = reviews.length
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : null;
        return res.json({ reviews, averageRating, total: reviews.length });
    }
    catch (error) {
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
exports.getProjectReviews = getProjectReviews;
/**
 * GET /api/reviews/my
 * Mes reviews (client)
 */
const getMyReviews = async (req, res) => {
    try {
        const clientId = req.user?.id;
        if (!clientId)
            return res.status(401).json({ message: 'Non authentifié' });
        const reviews = await Review_1.default.find({ client: clientId })
            .populate('project', 'name title')
            .sort({ createdAt: -1 });
        return res.json({ reviews });
    }
    catch (error) {
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
exports.getMyReviews = getMyReviews;
/**
 * PATCH /api/reviews/:id
 * Modifier mon review
 */
const updateReview = async (req, res) => {
    try {
        const clientId = req.user?.id;
        if (!clientId)
            return res.status(401).json({ message: 'Non authentifié' });
        const review = await Review_1.default.findOne({ _id: req.params.id, client: clientId });
        if (!review)
            return res.status(404).json({ message: 'Avis non trouvé' });
        if (review.status === 'published')
            return res.status(400).json({ message: 'Impossible de modifier un avis publié' });
        const { rating, comment } = req.body;
        if (rating !== undefined) {
            if (rating < 1 || rating > 5)
                return res.status(400).json({ message: 'Rating entre 1 et 5' });
            review.rating = rating;
        }
        if (comment !== undefined)
            review.comment = comment;
        review.status = 'pending';
        await review.save();
        return res.json({ review });
    }
    catch (error) {
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
exports.updateReview = updateReview;
/**
 * DELETE /api/reviews/:id
 * Supprimer mon review
 */
const deleteReview = async (req, res) => {
    try {
        const clientId = req.user?.id;
        if (!clientId)
            return res.status(401).json({ message: 'Non authentifié' });
        const review = await Review_1.default.findOneAndDelete({ _id: req.params.id, client: clientId });
        if (!review)
            return res.status(404).json({ message: 'Avis non trouvé' });
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
exports.deleteReview = deleteReview;
/**
 * POST /api/admin/reviews/:id/moderate
 * Admin approuve ou rejette un review
 */
const moderateReview = async (req, res) => {
    try {
        const { action } = req.body; // 'publish' | 'reject'
        if (!['publish', 'reject'].includes(action))
            return res.status(400).json({ message: 'action doit être "publish" ou "reject"' });
        const review = await Review_1.default.findByIdAndUpdate(req.params.id, { status: action === 'publish' ? 'published' : 'rejected' }, { new: true });
        if (!review)
            return res.status(404).json({ message: 'Avis non trouvé' });
        return res.json({ review });
    }
    catch (error) {
        return res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};
exports.moderateReview = moderateReview;
