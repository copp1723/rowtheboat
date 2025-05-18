/**
 * Base error class for all application errors
 */
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: unknown;
  cause?: unknown;
}

/**
 * Base error class for all application errors
 */
export class CodedError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context: Record<string, any>;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context: Record<string, any> = {}
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.code = context?.errorCode || 'UNEXPECTED_ERROR';
    this.name = this.constructor.name;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Add additional context to the error
   */
  public withContext(context: Record<string, any>): this {
    Object.assign(this.context, context);
    return this;
  }

  /**
   * Convert error to a plain object for logging
   */
  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Error for invalid input data
 */
export class ValidationError extends CodedError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 400, true, {
      errorCode: 'VALIDATION_ERROR',
      ...context,
    });
  }
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends CodedError {
  constructor(message: string = 'Authentication failed', context: Record<string, any> = {}) {
    super(message, 401, true, {
      errorCode: 'AUTHENTICATION_FAILED',
      ...context,
    });
  }
}

/**
 * Error for authorization failures
 */
export class AuthorizationError extends CodedError {
  constructor(
    message: string = 'Insufficient permissions', 
    context: Record<string, any> = {}
  ) {
    super(message, 403, true, {
      errorCode: 'AUTHORIZATION_FAILED',
      ...context,
    });
  }
}

/**
 * Error for resource not found
 */
export class NotFoundError extends CodedError {
  constructor(
    resource: string = 'Resource', 
    context: Record<string, any> = {}
  ) {
    super(`${resource} not found`, 404, true, {
      errorCode: 'NOT_FOUND',
      resource,
      ...context,
    });
  }
}

/**
 * Error for database operations
 */
export class DatabaseError extends CodedError {
  constructor(
    message: string = 'Database operation failed', 
    context: Record<string, any> = {}
  ) {
    super(message, 500, true, {
      errorCode: 'DATABASE_ERROR',
      ...context,
    });
  }
}

/**
 * Error for external service failures
 */
export class ExternalServiceError extends CodedError {
  constructor(
    service: string, 
    message: string = 'External service error', 
    context: Record<string, any> = {}
  ) {
    super(`${service}: ${message}`, 502, true, {
      errorCode: 'EXTERNAL_SERVICE_ERROR',
      service,
      ...context,
    });
  }
}

/**
 * Error for rate limiting
 */
export class RateLimitError extends CodedError {
  constructor(
    limit: number,
    window: string,
    context: Record<string, any> = {}
  ) {
    super(
      `Rate limit exceeded. Try again in ${window}`,
      429,
      true,
      {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        limit,
        window,
        ...context,
      }
    );
  }
}

/**
 * Error for workflow execution failures
 */
export class WorkflowError extends CodedError {
  constructor(
    workflowId: string,
    message: string = 'Workflow execution failed',
    context: Record<string, any> = {}
  ) {
    super(message, 500, true, {
      errorCode: 'WORKFLOW_ERROR',
      workflowId,
      ...context,
    });
  }
}

/**
 * Error for email sending failures
 */
export class EmailError extends CodedError {
  constructor(
    message: string = 'Failed to send email', 
    context: Record<string, any> = {}
  ) {
    super(message, 500, true, {
      errorCode: 'EMAIL_ERROR',
      ...context,
    });
  }
}

/**
 * Error for task parsing failures
 */
export class TaskParsingError extends CodedError {
  constructor(
    message: string = 'Failed to parse task', 
    context: Record<string, any> = {}
  ) {
    super(message, 400, true, {
      errorCode: 'TASK_PARSING_ERROR',
      ...context,
    });
  }
}

/**
 * Error for scheduler failures
 */
export class SchedulerError extends CodedError {
  constructor(
    message: string = 'Scheduler error', 
    context: Record<string, any> = {}
  ) {
    super(message, 500, true, {
      errorCode: 'SCHEDULER_ERROR',
      ...context,
    });
  }
}

/**
 * Error for configuration issues
 */
export class ConfigurationError extends CodedError {
  constructor(
    message: string = 'Configuration error', 
    context: Record<string, any> = {}
  ) {
    super(message, 500, false, {
      errorCode: 'CONFIGURATION_ERROR',
      ...context,
    });
  }
}

/**
 * Error for unexpected internal errors
 */
export class InternalError extends CodedError {
  constructor(
    message: string = 'An internal error occurred', 
    context: Record<string, any> = {}
  ) {
    super(message, 500, false, {
      errorCode: 'INTERNAL_ERROR',
      ...context,
    });
  }
}

/**
 * Helper function to determine if an error is an instance of AppError
 */
export function isAppError(error: any): error is CodedError {
  return (
    error instanceof CodedError ||
    (error && 
     typeof error === 'object' && 
     'isOperational' in error && 
     'statusCode' in error &&
     'code' in error)
  );
}

/**
 * Helper function to convert unknown errors to AppError
 */
export function toAppError(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred'
): CodedError {
  if (isAppError(error)) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const context: Record<string, any> = {
    originalError: error,
  };

  if (error instanceof Error) {
    context.stack = error.stack;
    context.name = error.name;
  }
  
  return new InternalError(
    errorMessage || defaultMessage,
    context
  );
}

type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'WORKFLOW_ERROR'
  | 'EMAIL_ERROR'
  | 'TASK_PARSING_ERROR'
  | 'SCHEDULER_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'INTERNAL_ERROR';
