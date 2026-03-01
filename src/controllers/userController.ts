import { Request, Response } from 'express';
import * as userService from '../services/userService';
import { Role } from '../config/roles';
import { AuthRequest } from '../middlewares/auth';

export const getProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  console.log('[UserController.getProfile] req.user:', req.user);
  const user = await userService.findUserById?.((req.user as any).id) || await userService.findUserByEmail((req.user as any).email || '');
  if (!user) return res.status(404).json({ message: 'User not found' });
  console.log('[UserController.getProfile] User found:', user.email, 'roles:', user.roles);
  
  // Retourner les informations du profil incluant avatar et nom
  const safe = {
    id: user._id,
    email: user.email,
    roles: user.roles,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    avatar: user.avatar || null, // URL de l'avatar ou null
    phone: user.phone || null,
    country: user.country || null,
    city: user.city || null,
    status: user.status || 'active',
    emailVerified: user.emailVerified || false,
    phoneVerified: user.phoneVerified || false,
    promoteurProfile: user.promoteurProfile || undefined,
  };
  console.log('[UserController.getProfile] Sending profile response with roles:', safe.roles, 'promoteurProfile:', safe.promoteurProfile);
  res.json(safe);
};

export const getUsers = async (_req: Request, res: Response) => {
  const users = await userService.listUsers();
  res.json(users);
};

export const promoteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!Object.values(Role).includes(role)) return res.status(400).json({ message: 'Invalid role' });
  const updated = await userService.promoteToRole(id, role);
  if (!updated) return res.status(404).json({ message: 'User not found' });
  res.json(updated);
};
