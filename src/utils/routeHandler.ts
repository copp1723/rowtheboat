import { Request, Response, NextFunction, RequestHandler } from 'express';
import { isError, toAppError } from '../utils/errorUtils.js';
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
export const routeHandler = (handler: (req: AnyRequest, res: Response, next: NextFunction) => any): RequestHandler => {
  return async (req: AnyRequest, res: Response, next: NextFunction) => {
    try {
      const result = await handler(req, res, next);
      
      if (result !== undefined) {
        res.json(result);
      }
    } catch (error) {
      const errorMessage = isError(error) 
        ? (error instanceof Error ? error.message : String(error)) 
        : String(error);
      
      next(toAppError(error));
    }
  };
};
