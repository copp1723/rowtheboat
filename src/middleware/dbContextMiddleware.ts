/**
 * Database Context Middleware
 *
 * This middleware sets the current user ID in the PostgreSQL session
 * for Row Level Security (RLS) policies to use.
 */
import { Request, Response, NextFunction } from 'express';
import { db } from '../shared/db.js';
import { sql } from 'drizzle-orm';
import { logger } from '../shared/logger.js';

// Define custom Request interface with user property
interface AuthRequest extends Request {
  user?: {
    claims?: {
      sub: string;
      [key: string]: any;
    };
    apiKeyId?: string;
    [key: string]: any;
  };
}

/**
 * Middleware to set the current user ID in the PostgreSQL session
 * This allows RLS policies to use the current_user_id() function
 */
export async function setDbContext(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // Get user ID from request
    const userId = req.user?.claims?.sub;

    // Get client IP address
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();

    // Set client IP in the PostgreSQL session for audit logging
    await db.execute(sql`SELECT set_config('app.client_ip', ${clientIp}, false)`);

    if (userId) {
      // Set the user ID in the PostgreSQL session
      await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`);

      // Check if user is admin and set the flag
      const isAdmin = req.user?.claims?.role === 'admin';
      await db.execute(sql`SELECT set_config('app.is_admin', ${isAdmin.toString()}, false)`);

      // For debugging in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug({
          event: 'db_context_set',
          userId,
          isAdmin,
          clientIp,
        }, `Set database context for user ${userId} (admin: ${isAdmin}, IP: ${clientIp})`);
      }
    } else {
      // Clear the user ID in the PostgreSQL session if no user is authenticated
      await db.execute(sql`SELECT set_config('app.current_user_id', '', false)`);
      await db.execute(sql`SELECT set_config('app.is_admin', 'false', false)`);

      // For debugging in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug({
          event: 'db_context_cleared',
          clientIp,
        }, `Cleared database context (no authenticated user, IP: ${clientIp})`);
      }
    }

    next();
  } catch (error) {
    logger.error({
      event: 'db_context_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Error setting database context');

    // Continue even if setting the context fails
    // This ensures the application doesn't break if there's an issue with the database
    next();
  }
}

export default setDbContext;
