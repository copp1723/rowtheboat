/**
 * Model Fallback System
 * 
 * This module provides fallback logic for LLM models,
 * allowing the system to gracefully degrade when primary models are unavailable.
 */
import { logger } from '../../utils/logger.js';
import { OpenAIService } from './openai.js';

/**
 * Model configuration
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'other';
  tier: 'primary' | 'secondary' | 'fallback';
  contextWindow: number;
  maxOutputTokens: number;
  costPer1KTokensInput: number;
  costPer1KTokensOutput: number;
  capabilities: string[];
  enabled: boolean;
}

/**
 * Default model configurations
 */
export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    tier: 'primary',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1KTokensInput: 0.005,
    costPer1KTokensOutput: 0.015,
    capabilities: ['reasoning', 'code', 'creative', 'analysis'],
    enabled: true,
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    tier: 'secondary',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1KTokensInput: 0.01,
    costPer1KTokensOutput: 0.03,
    capabilities: ['reasoning', 'code', 'creative', 'analysis'],
    enabled: true,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    tier: 'fallback',
    contextWindow: 16385,
    maxOutputTokens: 4096,
    costPer1KTokensInput: 0.0005,
    costPer1KTokensOutput: 0.0015,
    capabilities: ['basic', 'creative'],
    enabled: true,
  },
];

/**
 * Model fallback manager
 */
export class ModelFallbackManager {
  private models: ModelConfig[];
  private openaiService: OpenAIService;
  
  /**
   * Create a new model fallback manager
   * @param openaiService - OpenAI service instance
   * @param models - Model configurations (defaults to DEFAULT_MODELS)
   */
  constructor(openaiService: OpenAIService, models: ModelConfig[] = DEFAULT_MODELS) {
    this.openaiService = openaiService;
    this.models = [...models];
  }
  
  /**
   * Get all available models
   * @returns Array of model configurations
   */
  public getModels(): ModelConfig[] {
    return this.models.filter(model => model.enabled);
  }
  
  /**
   * Get a model by ID
   * @param modelId - Model ID
   * @returns Model configuration or undefined if not found
   */
  public getModel(modelId: string): ModelConfig | undefined {
    return this.models.find(model => model.id === modelId && model.enabled);
  }
  
  /**
   * Get fallback models for a given model
   * @param modelId - Model ID
   * @returns Array of fallback model configurations
   */
  public getFallbackModels(modelId: string): ModelConfig[] {
    const model = this.getModel(modelId);
    if (!model) {
      return [];
    }
    
    // Get models with the same capabilities but lower tier
    return this.models
      .filter(m => 
        m.enabled && 
        m.id !== modelId && 
        m.capabilities.some(cap => model.capabilities.includes(cap))
      )
      .sort((a, b) => {
        // Sort by tier (primary > secondary > fallback)
        const tierOrder = { primary: 0, secondary: 1, fallback: 2 };
        return tierOrder[a.tier] - tierOrder[b.tier];
      });
  }
  
  /**
   * Generate a completion with fallback
   * @param prompt - The prompt to send
   * @param options - Generation options
   * @returns The generated completion
   */
  public async generateWithFallback(
    prompt: string,
    options: {
      modelId?: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      responseFormat?: 'text' | 'json_object';
      userId?: string;
      promptVersion?: string;
      role?: string;
      requiredCapabilities?: string[];
    } = {}
  ): Promise<string> {
    // Get the primary model
    const primaryModelId = options.modelId || 'gpt-4o';
    const primaryModel = this.getModel(primaryModelId);
    
    if (!primaryModel) {
      throw new Error(`Model not found: ${primaryModelId}`);
    }
    
    try {
      // Try the primary model first
      return await this.openaiService.generateCompletion(prompt, {
        model: primaryModel.id,
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        responseFormat: options.responseFormat,
        userId: options.userId,
        promptVersion: options.promptVersion,
        role: options.role,
      });
    } catch (error) {
      logger.warn(`Primary model ${primaryModel.id} failed, trying fallbacks:`, error);
      
      // Get fallback models
      const fallbacks = this.getFallbackModels(primaryModel.id);
      
      // Filter by required capabilities if specified
      const eligibleFallbacks = options.requiredCapabilities
        ? fallbacks.filter(model => 
            options.requiredCapabilities!.every(cap => 
              model.capabilities.includes(cap)
            )
          )
        : fallbacks;
      
      // Try each fallback model in order
      for (const fallbackModel of eligibleFallbacks) {
        try {
          logger.info(`Trying fallback model: ${fallbackModel.id}`);
          
          return await this.openaiService.generateCompletion(prompt, {
            model: fallbackModel.id,
            systemPrompt: options.systemPrompt,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            responseFormat: options.responseFormat,
            userId: options.userId,
            promptVersion: options.promptVersion,
            role: options.role,
          });
        } catch (fallbackError) {
          logger.warn(`Fallback model ${fallbackModel.id} failed:`, fallbackError);
          // Continue to the next fallback
        }
      }
      
      // If all fallbacks failed, throw the original error
      throw error;
    }
  }
  
  /**
   * Add a new model configuration
   * @param model - Model configuration
   */
  public addModel(model: ModelConfig): void {
    // Check if the model already exists
    const existingIndex = this.models.findIndex(m => m.id === model.id);
    
    if (existingIndex >= 0) {
      // Update existing model
      this.models[existingIndex] = { ...model };
    } else {
      // Add new model
      this.models.push({ ...model });
    }
  }
  
  /**
   * Enable or disable a model
   * @param modelId - Model ID
   * @param enabled - Whether the model should be enabled
   * @returns true if the model was found and updated
   */
  public setModelEnabled(modelId: string, enabled: boolean): boolean {
    const model = this.models.find(m => m.id === modelId);
    
    if (model) {
      model.enabled = enabled;
      return true;
    }
    
    return false;
  }
}
