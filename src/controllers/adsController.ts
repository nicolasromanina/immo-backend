import { Request, Response } from 'express';
import { AdsService } from '../services/AdsService';
import { AuthRequest } from '../middlewares/auth';

export const createAd = async (req: AuthRequest, res: Response) => {
  try {
    // Prefer promoteurProfile (Promoteur._id) if available on the authenticated user
    const promoteurId = req.body.promoteurId || req.user?.promoteurProfile || req.user!.id;
    const ad = await AdsService.createAd(promoteurId as any, req.body);
    res.status(201).json(ad);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const submitAdForReview = async (req: AuthRequest, res: Response) => {
  try {
    const ad = await AdsService.submitForReview(req.params.id, req.user!.id);
    res.json(ad);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const approveAd = async (req: AuthRequest, res: Response) => {
  try {
    const ad = await AdsService.approveAd(req.params.id, req.user!.id);
    if (!ad) return res.status(404).json({ message: 'Annonce non trouvée' });
    res.json(ad);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const rejectAd = async (req: AuthRequest, res: Response) => {
  try {
    const ad = await AdsService.rejectAd(req.params.id, req.user!.id, req.body.reason);
    if (!ad) return res.status(404).json({ message: 'Annonce non trouvée' });
    res.json(ad);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const pauseAd = async (req: AuthRequest, res: Response) => {
  try {
    const ad = await AdsService.pauseAd(req.params.id, req.user!.id);
    if (!ad) return res.status(404).json({ message: 'Annonce non trouvée ou non pausable' });
    res.json(ad);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const resumeAd = async (req: AuthRequest, res: Response) => {
  try {
    const ad = await AdsService.resumeAd(req.params.id, req.user!.id);
    if (!ad) return res.status(404).json({ message: 'Annonce non trouvée ou non resumable' });
    res.json(ad);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const trackImpression = async (req: Request, res: Response) => {
  try {
    await AdsService.trackImpression(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const trackClick = async (req: Request, res: Response) => {
  try {
    await AdsService.trackClick(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyAds = async (req: AuthRequest, res: Response) => {
  try {
    // Try promoteurProfile first (Promoteur._id), fallback to User._id for backward compatibility
    const promoteurId = req.user?.promoteurProfile || req.user!.id;
    const userId = req.user!.id;
    const ads = await AdsService.getPromoteurAds(promoteurId as any, userId, {
      status: req.query.status as string,
      type: req.query.type as string,
    });
    res.json(ads);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllAds = async (req: AuthRequest, res: Response) => {
  try {
    const result = await AdsService.getAllAds({
      status: req.query.status as string,
      type: req.query.type as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getActiveAds = async (req: Request, res: Response) => {
  try {
    const ads = await AdsService.getActiveAdsForDisplay({
      city: req.query.city as string,
      country: req.query.country as string,
      type: req.query.type as string,
    });
    res.json(ads);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin pause/resume (force)
export const pauseAdAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const ad = await AdsService.pauseAdAdmin(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Annonce non trouvée' });
    res.json(ad);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const resumeAdAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const ad = await AdsService.resumeAdAdmin(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Annonce non trouvée' });
    res.json(ad);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const get7DayStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await AdsService.get7DayStats(req.params.id);
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
