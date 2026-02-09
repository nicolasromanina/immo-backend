import { Request, Response } from 'express';
import { ManagedServiceManager } from '../services/ManagedServiceManager';
import { AuthRequest } from '../middlewares/auth';

export const requestManagedService = async (req: AuthRequest, res: Response) => {
  try {
    const service = await ManagedServiceManager.requestManagedService({
      promoteurId: req.body.promoteurId || req.user!.id,
      ...req.body,
    });
    res.status(201).json(service);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const activateManagedService = async (req: AuthRequest, res: Response) => {
  try {
    const service = await ManagedServiceManager.activate(req.params.id, req.user!.id);
    if (!service) return res.status(404).json({ message: 'Service non trouvé' });
    res.json(service);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const logActivity = async (req: AuthRequest, res: Response) => {
  try {
    const service = await ManagedServiceManager.logActivity(
      req.params.id,
      req.body.action,
      req.user!.id,
      req.body.details
    );
    if (!service) return res.status(404).json({ message: 'Service non trouvé' });
    res.json(service);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyManagedServices = async (req: AuthRequest, res: Response) => {
  try {
    const services = await ManagedServiceManager.getForPromoteur(req.params.promoteurId || req.user!.id);
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllManagedServices = async (req: AuthRequest, res: Response) => {
  try {
    const result = await ManagedServiceManager.getAll({
      status: req.query.status as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const terminateManagedService = async (req: AuthRequest, res: Response) => {
  try {
    const service = await ManagedServiceManager.terminate(req.params.id, req.body.reason);
    if (!service) return res.status(404).json({ message: 'Service non trouvé' });
    res.json(service);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
