export interface ErrorWithMessage {
  message: string;
  stack?: string;
  name?: string;
}

/**
 * Type guard to check if an error is an instance of AppError
 * This delegates to the implementation in errorTypes.js
 */
export { isAppError } from '../shared/errorTypes.js';

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;
  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there are circular references
    return new Error(String(maybeError));
  }
}

/**
 * Type guard to check if an object is an Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  return toErrorWithMessage(error).message;
}

export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }
  if (isErrorWithMessage(error)) {
    return error.stack;
  }
  return undefined;
}

export function isCircuitOpenError(error: unknown): boolean {
  return isErrorWithMessage(error) && error.name === 'CircuitOpenError';
}

/**
 * Create a type-safe error object for logging
 */
export function createErrorLogObject(
  error: unknown,
  context: Record<string, any> = {}
): Record<string, any> {
  return {
    errorMessage: getErrorMessage(error),
    stack: getErrorStack(error),
    timestamp: new Date().toISOString(),
    ...context,
  };
}
