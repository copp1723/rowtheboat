/**
 * AI Core Module
 * 
 * This module exports the AI core functionality, including OpenAI integration,
 * prompt templates, audit logging, and model fallback.
 */
import { OpenAIService, openai } from './openai.js';
import {
  initializePromptSystem,
  getPromptTemplate,
  fillPromptTemplate,
  savePromptTemplate,
  loadAllPrompts,
  checkForPromptUpdates,
  type PromptTemplate,
  type PromptMetadata,
} from './promptTemplate.js';
import {
  logLLMInteraction,
  getLLMUsageStats,
  getRecentLLMInteractions,
  calculateLLMCost,
  type LLMLogEntry,
} from './llmAuditLogger.js';
import {
  ModelFallbackManager,
  DEFAULT_MODELS,
  type ModelConfig,
} from './modelFallback.js';
import { logger } from '../../utils/logger.js';

// Create a model fallback manager with the default OpenAI service
const modelFallbackManager = new ModelFallbackManager(openai);

/**
 * Initialize the AI core
 * @param options - Initialization options
 * @returns true if initialization was successful
 */
export async function initializeAICore(options: {
  openaiApiKey?: string;
  openaiCredentialId?: string;
  userId?: string;
  checkForPromptUpdatesInterval?: number;
} = {}): Promise<boolean> {
  try {
    // Initialize the prompt system
    await initializePromptSystem();
    
    // Initialize OpenAI
    let openaiInitialized = false;
    
    if (options.openaiApiKey) {
      // Initialize with API key
      openaiInitialized = openai.initialize(options.openaiApiKey);
    } else if (options.openaiCredentialId && options.userId) {
      // Initialize with credential from vault
      openaiInitialized = await openai.initializeWithCredential(
        options.openaiCredentialId,
        options.userId
      );
    } else if (process.env.OPENAI_API_KEY) {
      // Initialize with environment variable
      openaiInitialized = openai.initialize(process.env.OPENAI_API_KEY);
    }
    
    if (!openaiInitialized) {
      logger.warn('Failed to initialize OpenAI. Some AI features may not work.');
    }
    
    // Set up periodic prompt updates if requested
    if (options.checkForPromptUpdatesInterval) {
      setInterval(
        checkForPromptUpdates,
        options.checkForPromptUpdatesInterval
      );
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize AI core:', error);
    return false;
  }
}

/**
 * Generate a completion using a prompt template
 * @param templateName - Name of the prompt template
 * @param variables - Variables to fill in the template
 * @param options - Additional options for the API call
 * @returns The generated completion
 */
export async function generateFromTemplate(
  templateName: string,
  variables: Record<string, any>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json_object';
    userId?: string;
    useFallback?: boolean;
    requiredCapabilities?: string[];
  } = {}
): Promise<string> {
  // Load the prompt template
  const template = await getPromptTemplate(templateName);
  if (!template) {
    throw new Error(`Prompt template not found: ${templateName}`);
  }
  
  // Fill the template with variables
  const { systemPrompt, userPrompt } = fillPromptTemplate(template, variables);
  
  // If no user prompt, use an empty string
  const finalUserPrompt = userPrompt || '';
  
  // Generate the completion
  if (options.useFallback) {
    // Use the model fallback manager
    return modelFallbackManager.generateWithFallback(finalUserPrompt, {
      modelId: options.model || template.model,
      systemPrompt,
      temperature: options.temperature || template.temperature,
      maxTokens: options.maxTokens || template.maxTokens,
      responseFormat: options.responseFormat || template.responseFormat as any,
      userId: options.userId,
      promptVersion: template.version,
      role: templateName,
      requiredCapabilities: options.requiredCapabilities,
    });
  } else {
    // Use the OpenAI service directly
    return openai.generateCompletion(finalUserPrompt, {
      model: options.model || template.model,
      systemPrompt,
      temperature: options.temperature || template.temperature,
      maxTokens: options.maxTokens || template.maxTokens,
      responseFormat: options.responseFormat || template.responseFormat as any,
      userId: options.userId,
      promptVersion: template.version,
      role: templateName,
    });
  }
}

// Export all the components
export {
  openai,
  OpenAIService,
  getPromptTemplate,
  fillPromptTemplate,
  savePromptTemplate,
  loadAllPrompts,
  logLLMInteraction,
  getLLMUsageStats,
  getRecentLLMInteractions,
  calculateLLMCost,
  modelFallbackManager,
  DEFAULT_MODELS,
  type PromptTemplate,
  type PromptMetadata,
  type LLMLogEntry,
  type ModelConfig,
};
