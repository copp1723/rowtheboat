import { Request, Response, NextFunction, RequestHandler } from 'express';
import { isError } from '../utils/errorUtils.js';
// Use a type that allows for custom properties on the request
type AnyRequest = Request & {
  [key: string]: any;
  user?: {
    claims?: {
      sub: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
};
/**
 * Helper function to wrap Express route handlers and provide consistent error handling
 * This also fixes TypeScript type compatibility issues with Express route handlers
 *
 * @param handler - Express route handler function
 * @returns Wrapped route handler with consistent error handling
 */
export function routeHandler<P = any>(
  handler: (req: AnyRequest, res: Response, next?: NextFunction) => any
): RequestHandler<P> {
  return (req, res, next) => {
    try {
      const result = handler(req as AnyRequest, res, next);
      if (result instanceof Promise) {
        result.catch((error: Error) => {
          console.error('Route handler error:', error);
          if (!res.headersSent) {
            res.status(500).json({
              error: 'Internal server error',
              message:
                error instanceof Error
                  ? error instanceof Error
                    ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                    : String(error)
                  : String(error),
            });
          }
        });
      }
      return result;
    } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error)
        ? error instanceof Error
          ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
          : String(error)
        : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error)
        ? error instanceof Error
          ? isError(error)
            ? error instanceof Error
              ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
              : String(error)
            : String(error)
          : String(error)
        : String(error);
      console.error('Route handler error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message:
            error instanceof Error
              ? isError(error)
                ? error instanceof Error
                  ? isError(error)
                    ? error instanceof Error
                      ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
                      : String(error)
                    : String(error)
                  : String(error)
                : String(error)
              : String(error),
        });
      }
    }
  };
}
