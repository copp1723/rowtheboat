/**
 * RBAC Middleware
 * 
 * Provides middleware for role-based access control
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import { isError } from '../../utils/errorUtils.js';
import { checkApiKeyPermission } from '../../services/rbacService.js';
import { logSecurityEvent } from '../../services/awsKmsService.js';

// Define custom Request interface with user property
interface AuthRequest extends Request {
  user?: {
    claims?: {
      sub: string;
      role?: string;
      [key: string]: any;
    };
    apiKeyId?: string;
    [key: string]: any;
  };
}

/**
 * Middleware to check if a user has permission to access a resource
 * 
 * @param resource - Resource to check permission for
 * @param action - Action to check permission for
 * @returns Express middleware
 */
export function requirePermission(resource: string, action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          message: 'Unauthorized - Authentication required',
          error: 'authentication_required'
        });
      }

      // If using API key authentication
      if (req.user.apiKeyId) {
        const hasPermission = await checkApiKeyPermission(
          req.user.apiKeyId,
          resource,
          action
        );

        if (!hasPermission) {
          // Log security event
          await logSecurityEvent('permission_denied', req.user.claims?.sub, {
            resource,
            action,
            method: req.method,
            path: req.path,
            apiKeyId: req.user.apiKeyId,
          }, 'warning');

          return res.status(403).json({
            message: `Forbidden - Insufficient permissions for ${resource}:${action}`,
            error: 'insufficient_permissions'
          });
        }

        // Permission granted
        return next();
      }

      // If using user authentication (JWT)
      // This is a simplified implementation - in a real system, you would check
      // user permissions in a database or other source
      const userRole = req.user.claims?.role || 'user';
      
      // For development mode with admin header
      if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-admin'] === 'true') {
        console.log('Admin access granted in development mode');
        return next();
      }

      // In a real implementation, you would check the user's permissions here
      // For now, we'll allow access for admins to everything
      if (userRole === 'admin') {
        return next();
      }

      // For other roles, you would implement proper permission checking
      // This is a placeholder for future implementation
      console.warn('Permission checking for user roles not fully implemented');
      
      // Log security event
      await logSecurityEvent('permission_check_incomplete', req.user.claims?.sub, {
        resource,
        action,
        method: req.method,
        path: req.path,
        userRole,
      }, 'warning');
      
      // For now, allow access
      return next();
    } catch (error) {
      const errorMessage = isError(error) ? error.message : String(error);
      logger.error({
        event: 'permission_check_error',
        error: errorMessage,
        resource,
        action,
        method: req.method,
        path: req.path,
      }, `Permission check error: ${errorMessage}`);

      // Log security event
      await logSecurityEvent('permission_check_error', req.user?.claims?.sub, {
        resource,
        action,
        method: req.method,
        path: req.path,
        error: errorMessage,
      }, 'error');

      return res.status(500).json({
        message: 'Internal server error during permission check',
        error: 'permission_check_error'
      });
    }
  };
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.claims) {
      return res.status(401).json({
        message: 'Unauthorized - Authentication required',
        error: 'authentication_required'
      });
    }

    // For development mode with admin header
    if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-admin'] === 'true') {
      console.log('Admin access granted in development mode');
      return next();
    }

    // Check if the user has the admin role
    const isUserAdmin = req.user.claims.role === 'admin';

    if (!isUserAdmin) {
      // Log security event
      logSecurityEvent('admin_access_denied', req.user.claims.sub, {
        method: req.method,
        path: req.path,
        userRole: req.user.claims.role,
      }, 'warning');

      return res.status(403).json({
        message: 'Forbidden - Admin access required',
        error: 'admin_access_required'
      });
    }

    // Admin access granted
    return next();
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'admin_check_error',
      error: errorMessage,
      method: req.method,
      path: req.path,
    }, `Admin check error: ${errorMessage}`);

    // Log security event
    logSecurityEvent('admin_check_error', req.user?.claims?.sub, {
      method: req.method,
      path: req.path,
      error: errorMessage,
    }, 'error');

    return res.status(500).json({
      message: 'Internal server error during admin check',
      error: 'admin_check_error'
    });
  }
}

// Export the middleware
export default {
  requirePermission,
  requireAdmin,
};
