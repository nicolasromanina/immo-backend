import { Request, Response } from 'express';
import { DisclaimerService } from '../services/DisclaimerService';
import { AuthRequest } from '../middlewares/auth';

export const getAllDisclaimers = async (req: Request, res: Response) => {
  try {
    const locale = (req.query.locale as string) || 'fr';
    const disclaimers = await DisclaimerService.getAll(locale);
    res.json(disclaimers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDisclaimerBySlug = async (req: Request, res: Response) => {
  try {
    const locale = (req.query.locale as string) || 'fr';
    const disclaimer = await DisclaimerService.getBySlug(req.params.slug, locale);
    if (!disclaimer) {
      return res.status(404).json({ message: 'Disclaimer non trouvé' });
    }
    res.json(disclaimer);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDisclaimer = async (req: AuthRequest, res: Response) => {
  try {
    const disclaimer = await DisclaimerService.update(req.params.slug, req.body, req.user!.id);
    if (!disclaimer) {
      return res.status(404).json({ message: 'Disclaimer non trouvé' });
    }
    res.json(disclaimer);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const initializeDisclaimers = async (req: AuthRequest, res: Response) => {
  try {
    await DisclaimerService.initializeDefaults();
    res.json({ message: 'Disclaimers initialisés avec succès' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
