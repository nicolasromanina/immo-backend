import { Router, Request, Response } from 'express';
import Promoteur from '../models/Promoteur';

const router = Router();

/**
 * GET /api/public/promoteurs/top-rated
 * Récupère les promoteurs les mieux notés (public)
 */
router.get('/top-rated', async (req: Request, res: Response) => {
  try {
    const limit = 20;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    // Récupérer les promoteurs avec KYC verified, sorted par trustScore décroissant
    const promoters = await Promoteur.find({
      kycStatus: 'verified',
      subscriptionStatus: { $in: ['active', 'trial'] }
    })
      .select('_id organizationName plan description logo trustScore activeProjects user kycStatus')
      .populate('user', 'avatar')
      .sort({ trustScore: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Promoteur.countDocuments({
      kycStatus: 'verified',
      subscriptionStatus: { $in: ['active', 'trial'] }
    });

    res.json({
      data: promoters,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        hasNextPage: skip + limit < total,
        hasPreviousPage: page > 1,
      }
    });
  } catch (error) {
    console.error('Erreur récupération promoteurs:', error);
    res.status(500).json({ message: 'Erreur serveur', error: (error as any).message });
  }
});

/**
 * GET /api/public/promoteurs
 * Récupère tous les promoteurs publics avec pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const promoters = await Promoteur.find({
      subscriptionStatus: { $in: ['active', 'trial'] }
    })
      .select('_id organizationName plan description logo trustScore activeProjects user kycStatus')
      .populate('user', 'avatar')
      .sort({ trustScore: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Promoteur.countDocuments({
      subscriptionStatus: { $in: ['active', 'trial'] }
    });

    res.json({
      data: promoters,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        hasNextPage: skip + limit < total,
        hasPreviousPage: page > 1,
      }
    });
  } catch (error) {
    console.error('Erreur récupération promoteurs:', error);
    res.status(500).json({ message: 'Erreur serveur', error: (error as any).message });
  }
});

export default router;
