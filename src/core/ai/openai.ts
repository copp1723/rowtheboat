/**
 * OpenAI Service
 * 
 * This service provides a centralized interface for interacting with the OpenAI API.
 * It handles authentication, error handling, retry logic, and audit logging.
 */
import { OpenAI } from 'openai';
import { getCredentialById } from '../../services/credentialVault.js';
import { db } from '../../shared/db.js';
import { insightLogs } from '../../shared/schema.js';
import { logger } from '../../utils/logger.js';
import { createCircuitBreaker } from '../../utils/circuitBreaker.js';
import { isError } from '../../utils/errorUtils.js';

// Circuit breaker for OpenAI API calls
const openaiBreaker = createCircuitBreaker('openai-api', {
  failureThreshold: 5,
  resetTimeout: 5 * 60 * 1000, // 5 minutes
});

// Error types for better error handling
export enum OpenAIErrorType {
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  QUOTA_EXCEEDED = 'quota_exceeded',
  INVALID_REQUEST = 'invalid_request',
  SERVER_ERROR = 'server_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

// OpenAI service options
export interface OpenAIServiceOptions {
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  fallbackModel?: string;
  enableAuditLogging?: boolean;
}

// Default options
const DEFAULT_OPTIONS: OpenAIServiceOptions = {
  defaultModel: 'gpt-4o',
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  fallbackModel: 'gpt-3.5-turbo',
  enableAuditLogging: true,
};

/**
 * OpenAI Service for interacting with OpenAI API
 */
export class OpenAIService {
  private client: OpenAI | null = null;
  private options: OpenAIServiceOptions;
  private apiKeyHint: string = '';

  /**
   * Create a new OpenAI service
   * @param options - Service configuration options
   */
  constructor(options: Partial<OpenAIServiceOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize the OpenAI client with an API key
   * @param apiKey - OpenAI API key
   * @returns true if initialization was successful
   */
  public initialize(apiKey: string): boolean {
    try {
      if (!apiKey) {
        throw new Error('OpenAI API key is required');
      }

      this.client = new OpenAI({
        apiKey,
      });

      // Store last 4 chars of API key for debugging (not the full key)
      this.apiKeyHint = apiKey.slice(-4);

      return true;
    } catch (error) {
      logger.error('Failed to initialize OpenAI client:', error);
      return false;
    }
  }

  /**
   * Initialize the OpenAI client with a credential from the vault
   * @param credentialId - ID of the credential in the vault
   * @param userId - User ID who owns the credential
   * @returns true if initialization was successful
   */
  public async initializeWithCredential(credentialId: string, userId: string): Promise<boolean> {
    try {
      const credential = await getCredentialById(credentialId, userId);
      if (!credential) {
        throw new Error(`Credential not found: ${credentialId}`);
      }

      // Assuming the credential data has an apiKey property
      const apiKey = credential.data.apiKey;
      if (!apiKey) {
        throw new Error('API key not found in credential data');
      }

      return this.initialize(apiKey);
    } catch (error) {
      logger.error('Failed to initialize OpenAI client with credential:', error);
      return false;
    }
  }

  /**
   * Generate a completion using the OpenAI API
   * @param prompt - The prompt to send to the API
   * @param options - Additional options for the API call
   * @returns The generated completion
   */
  public async generateCompletion(
    prompt: string,
    options: {
      model?: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      responseFormat?: 'text' | 'json_object';
      userId?: string;
      promptVersion?: string;
      role?: string;
    } = {}
  ): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const model = options.model || this.options.defaultModel;
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < (this.options.maxRetries || 1)) {
      try {
        // Check circuit breaker before making the request
        await openaiBreaker.beforeRequest();

        // Prepare messages for OpenAI
        const messages = [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ];

        // Configure response format if specified
        const responseFormat = options.responseFormat
          ? { type: options.responseFormat }
          : undefined;

        // Call OpenAI API
        const response = await this.client.chat.completions.create({
          model,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens,
          response_format: responseFormat as any,
        });

        // Parse the response
        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        // Log successful request
        if (this.options.enableAuditLogging) {
          await this.logCompletion({
            success: true,
            durationMs: Date.now() - startTime,
            role: options.role,
            promptVersion: options.promptVersion,
            rawResponse: response,
            rawPrompt: JSON.stringify(messages),
            userId: options.userId,
          });
        }

        // Record success in circuit breaker
        await openaiBreaker.afterSuccess();

        return content;
      } catch (error) {
        attempt++;
        lastError = isError(error) ? error : new Error(String(error));

        // Record failure in circuit breaker if not retrying
        if (attempt >= (this.options.maxRetries || 1)) {
          await openaiBreaker.afterFailure();

          // Log failed request
          if (this.options.enableAuditLogging) {
            await this.logCompletion({
              success: false,
              durationMs: Date.now() - startTime,
              role: options.role,
              promptVersion: options.promptVersion,
              error: lastError.message,
              rawPrompt: JSON.stringify([
                {
                  role: 'system',
                  content: options.systemPrompt || 'You are a helpful assistant.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ]),
              userId: options.userId,
            });
          }
        }

        // If we have more retries, wait before trying again
        if (attempt < (this.options.maxRetries || 1)) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('Failed to generate completion after retries');
  }

  /**
   * Log a completion request to the database
   * @param data - Log data
   */
  private async logCompletion(data: {
    success: boolean;
    durationMs: number;
    role?: string;
    promptVersion?: string;
    rawResponse?: any;
    rawPrompt?: string;
    error?: string;
    userId?: string;
  }): Promise<void> {
    try {
      await db.insert(insightLogs).values({
        success: data.success,
        durationMs: data.durationMs,
        role: data.role,
        promptVersion: data.promptVersion,
        rawResponse: data.rawResponse ? JSON.stringify(data.rawResponse) : null,
        rawPrompt: data.rawPrompt,
        error: data.error,
        apiKeyHint: this.apiKeyHint,
        userId: data.userId,
      });
    } catch (error) {
      logger.error('Failed to log completion:', error);
    }
  }
}

// Export a singleton instance for convenience
export const openai = new OpenAIService();
