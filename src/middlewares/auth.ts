import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../config/roles';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: { id: string; roles: Role[]; promoteurProfile?: any };
}

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    console.log('[authenticateJWT] Token décodé:', decoded);
    req.user = { id: decoded.id, roles: decoded.roles };
    
    // Load promoteurProfile from database for controllers that need it
    try {
      const user = await User.findById(req.user.id);
      if (user?.promoteurProfile) {
        req.user.promoteurProfile = user.promoteurProfile;
      }
    } catch (err) {
      // Log error but continue - don't fail the request
      console.error('[authenticateJWT] Error loading promoteur profile:', err);
    }
    
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

export const authenticateJWTOptional = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    // No token provided - continue without authentication
    // req.user will be undefined
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    console.log('[authenticateJWTOptional] Token décodé:', decoded);
    req.user = { id: decoded.id, roles: decoded.roles };
    
    // Load promoteurProfile from database for controllers that need it
    try {
      const user = await User.findById(req.user.id);
      if (user?.promoteurProfile) {
        req.user.promoteurProfile = user.promoteurProfile;
      }
    } catch (err) {
      console.error('[authenticateJWTOptional] Error loading promoteur profile:', err);
    }
    
    next();
  } catch (err) {
    // Invalid token - continue without authentication
    console.warn('[authenticateJWTOptional] Invalid token, continuing without auth');
    next();
  }
};

export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
};
