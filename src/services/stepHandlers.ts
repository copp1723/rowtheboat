/**
 * Step Handlers
 * 
 * Provides handlers for workflow steps
 * @stub
 * @fileImplementationStatus partial-mock
 * @fileStubNote This file contains mock implementations for workflow step handlers. Replace with real logic for production.
 */
import { info, warn, error } from '../shared/logger';

/**
 * Step handler interface
 */
export interface StepHandler {
  (config: Record<string, any>, context: Record<string, any>): Promise<any>;
}

/**
 * Email step handler
 * @stub
 * @mock
 * @implementationStatus mock
 * @param config
 * @param context
 * @returns Mocked email send result
 */
const emailHandler: StepHandler = async (config, context) => {
  warn('[STUB] Using mock emailHandler', { config, context });
  return {
    success: true,
    messageId: `mock-email-${Date.now()}`,
    stub: true,
    note: 'This is a mock email handler. No real email sent.'
  };
};

/**
 * HTTP request step handler
 * @stub
 * @mock
 * @implementationStatus mock
 * @param config
 * @param context
 * @returns Mocked HTTP request result
 */
const httpHandler: StepHandler = async (config, context) => {
  warn('[STUB] Using mock httpHandler', { config, context });
  return {
    success: true,
    statusCode: 200,
    data: { message: 'Mock HTTP request succeeded' },
    stub: true,
    note: 'This is a mock HTTP handler. No real request made.'
  };
};

/**
 * Data processing step handler
 * @stub
 * @mock
 * @implementationStatus mock
 * @param config
 * @param context
 * @returns Mocked data processing result
 */
const dataProcessingHandler: StepHandler = async (config, context) => {
  warn('[STUB] Using mock dataProcessingHandler', { config, context });
  return {
    success: true,
    processedData: { message: 'Mock data processed successfully' },
    stub: true,
    note: 'This is a mock data processing handler.'
  };
};

/**
 * Delay step handler
 * @stub
 * @mock
 * @implementationStatus mock
 * @param config
 * @param context
 * @returns Mocked delay result
 */
const delayHandler: StepHandler = async (config, context) => {
  warn('[STUB] Using mock delayHandler', { config, context });
  return {
    success: true,
    delayedUntil: new Date(Date.now() + (config.duration || 0)),
    stub: true,
    note: 'This is a mock delay handler. No real delay performed.'
  };
};

/**
 * Export step handlers
 */
export const stepHandlers: Record<string, StepHandler> = {
  email: emailHandler,
  http: httpHandler,
  dataProcessing: dataProcessingHandler,
  delay: delayHandler,
};

// Export default object for modules that import the entire service
export default stepHandlers;
