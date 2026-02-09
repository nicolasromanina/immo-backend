import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../config/roles';

export interface AuthRequest extends Request {
  user?: { id: string; roles: Role[] };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    console.log('[authenticateJWT] Token décodé:', decoded);
    req.user = { id: decoded.id, roles: decoded.roles };
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
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
