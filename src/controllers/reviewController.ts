import { Request, Response } from 'express';
import Review from '../models/Review';
import Project from '../models/Project';
import Promoteur from '../models/Promoteur';
import { AuthRequest } from '../middlewares/auth';

/**
 * POST /api/reviews
 * Client crée un review (1 review par projet max)
 */
export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ message: 'Non authentifié' });

    const { projectId, rating, comment } = req.body;
    if (!projectId || !rating) return res.status(400).json({ message: 'projectId et rating requis' });
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating entre 1 et 5' });

    const project = await Project.findById(projectId).select('promoteur');
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    const existing = await Review.findOne({ client: clientId, project: projectId });
    if (existing) return res.status(400).json({ message: 'Vous avez déjà laissé un avis pour ce projet' });

    const review = new Review({
      client: clientId,
      project: projectId,
      promoteur: project.promoteur,
      rating,
      comment,
    });
    await review.save();

    return res.status(201).json({ review });
  } catch (error: any) {
    if (error.code === 11000) return res.status(400).json({ message: 'Vous avez déjà laissé un avis pour ce projet' });
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/reviews/project/:projectId
 * Reviews publics d'un projet
 */
export const getProjectReviews = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const reviews = await Review.find({ project: projectId, status: 'published' })
      .populate('client', 'firstName lastName email')
      .sort({ createdAt: -1 });
    const averageRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;
    return res.json({ reviews, averageRating, total: reviews.length });
  } catch (error: any) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/reviews/my
 * Mes reviews (client)
 */
export const getMyReviews = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ message: 'Non authentifié' });

    const reviews = await Review.find({ client: clientId })
      .populate('project', 'name title')
      .sort({ createdAt: -1 });
    return res.json({ reviews });
  } catch (error: any) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * PATCH /api/reviews/:id
 * Modifier mon review
 */
export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ message: 'Non authentifié' });

    const review = await Review.findOne({ _id: req.params.id, client: clientId });
    if (!review) return res.status(404).json({ message: 'Avis non trouvé' });
    if (review.status === 'published') return res.status(400).json({ message: 'Impossible de modifier un avis publié' });

    const { rating, comment } = req.body;
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating entre 1 et 5' });
      review.rating = rating;
    }
    if (comment !== undefined) review.comment = comment;
    review.status = 'pending';
    await review.save();

    return res.json({ review });
  } catch (error: any) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * DELETE /api/reviews/:id
 * Supprimer mon review
 */
export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ message: 'Non authentifié' });

    const review = await Review.findOneAndDelete({ _id: req.params.id, client: clientId });
    if (!review) return res.status(404).json({ message: 'Avis non trouvé' });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * POST /api/admin/reviews/:id/moderate
 * Admin approuve ou rejette un review
 */
export const moderateReview = async (req: AuthRequest, res: Response) => {
  try {
    const { action } = req.body; // 'publish' | 'reject'
    if (!['publish', 'reject'].includes(action)) return res.status(400).json({ message: 'action doit être "publish" ou "reject"' });

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: action === 'publish' ? 'published' : 'rejected' },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: 'Avis non trouvé' });
    return res.json({ review });
  } catch (error: any) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
