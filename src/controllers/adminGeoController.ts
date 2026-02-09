import { Request, Response } from 'express';
import { AdminGeoService } from '../services/AdminGeoService';
import { AuthRequest } from '../middlewares/auth';

export const assignAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const assignment = await AdminGeoService.assignAdmin(req.body);
    res.status(201).json(assignment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getAdminForLocation = async (req: Request, res: Response) => {
  try {
    const { country, city, role } = req.query;
    const admins = await AdminGeoService.getAdminForLocation(
      country as string,
      city as string,
      role as string
    );
    res.json(admins);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const assignments = await AdminGeoService.getAllAssignments();
    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const removeAssignment = async (req: AuthRequest, res: Response) => {
  try {
    await AdminGeoService.removeAssignment(req.params.id);
    res.json({ message: 'Assignment supprimé' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
