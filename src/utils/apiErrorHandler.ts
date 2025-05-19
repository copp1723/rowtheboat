import { logError } from '../shared/errorHandler.js';
import { 
  isAppError, 
  toAppError, 
  AppError
} from '../shared/errorTypes.js';
import {
  ERROR_CODES,
  type ErrorCode
} from '../shared/errorTypes.js';

/**
 * Options for handling API errors
 */
interface ApiErrorHandlerOptions {
  /**
   * Whether to log the error (default: true)
   */
  logError?: boolean;
  
  /**
   * Default error message if none is provided
   */
  defaultMessage?: string;
  
  /**
   * Default error code if none is provided
   */
  defaultCode?: ErrorCode;
  
  /**
   * Additional context to include with the error
   */
  context?: Record<string, any>;
  
  /**
   * Whether to rethrow the error (default: true)
   */
  rethrow?: boolean;
}

/**
 * Handle API errors consistently
 * @param error The error to handle
 * @param options Handler options
 * @returns The processed error (if not rethrown)
 */
export function handleApiError(
  error: unknown,
  options: ApiErrorHandlerOptions = {}
): AppError {
  const {
    logError: shouldLog = true,
    defaultMessage = 'An error occurred while processing your request',
    defaultCode = 'INTERNAL_ERROR',
    context = {},
    rethrow = true,
  } = options;
  
  // Convert to AppError if it's not already
  const appError = isAppError(error) 
    ? error 
    : toAppError(error, defaultMessage);
  
  // Set default code if not set
  if (!appError.code || appError.code === 'UNEXPECTED_ERROR') {
    appError.code = defaultCode;
  }
  
  // Add context if provided
  if (Object.keys(context).length > 0) {
    appError.context = { ...appError.context, ...context };
  }
  
  // Log the error if needed
  if (shouldLog) {
    logError(appError, { 
      ...context,
      handler: 'handleApiError',
    });
  }
  
  // Rethrow if needed
  if (rethrow) {
    throw appError;
  }
  
  return appError;
}

/**
 * Create an API error handler with default options
 */
export function createApiErrorHandler(defaultOptions: ApiErrorHandlerOptions = {}) {
  return (error: unknown, options: ApiErrorHandlerOptions = {}) => 
    handleApiError(error, { ...defaultOptions, ...options });
}

/**
 * Handle API responses consistently
 */
export async function handleApiResponse<T>(
  response: Response,
  options: {
    /**
     * Whether to parse the response as JSON (default: true)
     */
    parseJson?: boolean;
    
    /**
     * Expected status codes (default: [200, 201, 204])
     */
    expectedStatuses?: number[];
    
    /**
     * Context for error messages
     */
    context?: Record<string, any>;
  } = {}
): Promise<T> {
  const {
    parseJson = true,
    expectedStatuses = [200, 201, 204],
    context = {},
  } = options;
  
  const { status, statusText } = response;
  const isSuccess = expectedStatuses.includes(status);
  
  // For successful responses, parse and return the data
  if (isSuccess) {
    try {
      if (!parseJson) {
        return undefined as unknown as T;
      }
      
      const data = await response.json().catch(() => ({}));
      return data as T;
    } catch (error) {
      throw handleApiError(error, {
        defaultMessage: 'Failed to parse response',
        defaultCode: 'INVALID_RESPONSE',
        context: {
          ...context,
          status,
          statusText,
        },
      });
    }
  }
  
  // For error responses, parse the error message if possible
  try {
    const errorData = await response.json().catch(() => ({}));
    
    throw handleApiError(new Error(errorData.message || statusText), {
      defaultMessage: statusText || 'Request failed',
      defaultCode: getErrorCodeFromStatus(status) as ErrorCode,
      context: {
        ...context,
        status,
        statusText,
        response: errorData,
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }
    
    throw handleApiError(error, {
      defaultMessage: statusText || 'Request failed',
      defaultCode: getErrorCodeFromStatus(status) as ErrorCode,
      context: {
        ...context,
        status,
        statusText,
      },
    });
  }
}

/**
 * Map HTTP status codes to error codes
 */
function getErrorCodeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 502:
    case 503:
    case 504:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Create a consistent API response
 */
export function createApiResponse<T>(
  data: T,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options;
  
  const responseHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  });
  
  const body = JSON.stringify({
    status: 'success',
    data,
  });
  
  return new Response(body, {
    status,
    statusText,
    headers: responseHeaders,
  });
}

/**
 * Create an error response
 */
export function createErrorResponse(
  error: unknown,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    includeDetails?: boolean;
  } = {}
): Response {
  const { 
    status = 500, 
    statusText = 'Internal Server Error',
    headers = {},
    includeDetails = process.env.NODE_ENV !== 'production',
  } = options;
  
  const appError = isAppError(error) ? error : toAppError(error);
  
  const responseData = {
    status: 'error',
    error: {
      code: appError.code,
      message: appError.message,
      ...(includeDetails && appError.context ? { details: appError.context } : {}),
    },
  };
  
  const responseHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  });
  
  return new Response(JSON.stringify(responseData), {
    status: appError.statusCode || status,
    statusText: appError.message || statusText,
    headers: responseHeaders,
  });
}
