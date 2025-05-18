/**
 * Authentication middleware for Express routes
 */
import { Request, Response, NextFunction } from 'express';
// Define custom Request interface with user property
interface AuthRequest extends Request {
  user?: {
    claims?: {
      sub: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}
/**
 * Middleware to check if a user is authenticated
 * For development purposes, this is a simplified version
 */
export const isAuthenticated = (req: AuthRequest, res: Response, next: NextFunction) => {
  // For development, we'll simulate an authenticated user
  // In production, this would validate a JWT token or session
  req.user = {
    claims: {
      sub: 'dev-user-123',
      name: 'Development User',
      email: 'dev@example.com',
    },
  };
  next();
};
/**
 * Middleware to check if a user has admin role
 */
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Check if user is authenticated first
  if (!req.user || !req.user.claims) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // For development, we'll simulate admin check
  // In production, this would check roles in the JWT or database
  const isUserAdmin = req.user.claims.sub === 'dev-user-123';
  if (!isUserAdmin) {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  next();
};
