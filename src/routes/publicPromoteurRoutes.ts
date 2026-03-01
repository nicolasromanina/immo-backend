import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Promoteur from '../models/Promoteur';
import Lead from '../models/Lead';
import User from '../models/User';
import { authenticateJWT, AuthRequest } from '../middlewares/auth';
import { InvitationService } from '../services/InvitationService';
import { getJwtSecret } from '../config/jwt';

const router = Router();

async function attachPublicLeadMetrics<T extends { _id: any; totalLeadsReceived?: number; averageResponseTime?: number }>(
  promoters: T[]
): Promise<Array<T & { responseRate?: number; totalLeadsReceived: number; averageResponseTime?: number }>> {
  if (!promoters.length) {
    return [];
  }

  const promoterIds = promoters.map((p) => p._id);

  const leadMetrics = await Lead.aggregate([
    {
      $match: {
        promoteur: { $in: promoterIds },
      },
    },
    {
      $group: {
        _id: '$promoteur',
        totalLeads: { $sum: 1 },
        respondedLeads: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $ifNull: ['$lastContactDate', false] },
                  { $ne: ['$status', 'nouveau'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        avgResponseTime: {
          $avg: {
            $ifNull: [
              '$responseTime',
              {
                $cond: [
                  { $ifNull: ['$lastContactDate', false] },
                  {
                    $divide: [
                      { $subtract: ['$lastContactDate', '$createdAt'] },
                      1000 * 60 * 60,
                    ],
                  },
                  null,
                ],
              },
            ],
          },
        },
      },
    },
  ]);

  const metricsByPromoter = new Map<string, { totalLeads: number; respondedLeads: number; avgResponseTime?: number }>();
  for (const metric of leadMetrics) {
    metricsByPromoter.set(String(metric._id), {
      totalLeads: metric.totalLeads || 0,
      respondedLeads: metric.respondedLeads || 0,
      avgResponseTime: typeof metric.avgResponseTime === 'number' ? metric.avgResponseTime : undefined,
    });
  }

  return promoters.map((promoter) => {
    const metrics = metricsByPromoter.get(String(promoter._id));
    const totalLeadsReceived = promoter.totalLeadsReceived ?? metrics?.totalLeads ?? 0;
    const responseRate =
      metrics && metrics.totalLeads > 0
        ? Number(((metrics.respondedLeads / metrics.totalLeads) * 100).toFixed(1))
        : undefined;

    const averageResponseTime =
      typeof promoter.averageResponseTime === 'number'
        ? promoter.averageResponseTime
        : typeof metrics?.avgResponseTime === 'number'
          ? Number(metrics.avgResponseTime.toFixed(1))
          : undefined;

    return {
      ...promoter,
      totalLeadsReceived,
      averageResponseTime,
      responseRate,
    };
  });
}

/**
 * GET /api/public/promoteurs/profile
 * Récupère le profil de l'utilisateur connecté (sans requérir le rôle PROMOTEUR)
 * Utilisé pour l'authentification et le chargement initial
 */
router.get('/profile', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    console.log('[publicPromoteurRoutes.profile] Fetching user:', req.user!.id);
    const user = await User.findById(req.user!.id);
    console.log('[publicPromoteurRoutes.profile] User found:', !!user, user?.email);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const responseData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      country: user.country,
      city: user.city,
      avatar: user.avatar,
      roles: user.roles,
      promoteurProfile: user.promoteurProfile
    };
    
    console.log('[publicPromoteurRoutes.profile] Returning:', JSON.stringify(responseData));
    res.json(responseData);
  } catch (error: any) {
    console.error('[publicPromoteurRoutes.profile] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

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
      .select('_id organizationName plan description logo trustScore activeProjects totalProjects totalLeadsReceived averageResponseTime user kycStatus')
      .populate('user', 'avatar')
      .sort({ trustScore: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const promotersWithMetrics = await attachPublicLeadMetrics(promoters);

    const total = await Promoteur.countDocuments({
      kycStatus: 'verified',
      subscriptionStatus: { $in: ['active', 'trial'] }
    });

    res.json({
      data: promotersWithMetrics,
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
      .select('_id organizationName plan description logo trustScore activeProjects totalProjects totalLeadsReceived averageResponseTime user kycStatus')
      .populate('user', 'avatar')
      .sort({ trustScore: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const promotersWithMetrics = await attachPublicLeadMetrics(promoters);

    const total = await Promoteur.countDocuments({
      subscriptionStatus: { $in: ['active', 'trial'] }
    });

    res.json({
      data: promotersWithMetrics,
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
 * POST /api/public/promoteurs/accept-invitation/:token
 * Accepte une invitation d'équipe (accessible par utilisateur non-PROMOTEUR)
 */
router.post('/accept-invitation/:token', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    console.log('[acceptInvitation] Controller called - token:', req.params.token, 'userId:', req.user!.id);
    
    const result = await InvitationService.acceptInvitation(req.params.token, req.user!.id);
    console.log('[acceptInvitation] Invitation accepted, user roles:', result.user?.roles);

    // Après avoir accepté l'invitation, générer un nouveau JWT avec les nouveaux rôles et promoteurProfile
    console.log('[acceptInvitation] Generating new JWT with updated roles...');
    const newJWT = jwt.sign(
      {
        id: result.user!._id,
        roles: result.user!.roles,
        promoteurProfile: result.user!.promoteurProfile
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );
    console.log('[acceptInvitation] New JWT generated with roles:', result.user!.roles, 'promoteurProfile:', result.user!.promoteurProfile);

    res.json({ 
      ...result, 
      newJWT 
    });
  } catch (error: any) {
    console.log('[acceptInvitation] Error:', error.message);
    res.status(400).json({ message: error.message });
  }
});

export default router;
