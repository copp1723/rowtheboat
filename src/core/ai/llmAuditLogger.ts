/**
 * LLM Audit Logger
 * 
 * This module provides comprehensive logging for LLM interactions,
 * including prompts, responses, and metadata for compliance and analysis.
 */
import { db } from '../../shared/db.js';
import { insightLogs } from '../../shared/schema.js';
import { logger } from '../../utils/logger.js';
import { sql } from 'drizzle-orm';

/**
 * LLM interaction log entry
 */
export interface LLMLogEntry {
  id?: number;
  createdAt?: Date;
  success: boolean;
  durationMs?: number;
  error?: string;
  role?: string;
  promptVersion?: string;
  rawResponse?: any;
  rawPrompt?: string;
  apiKeyHint?: string;
  userId?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  metadata?: Record<string, any>;
}

/**
 * Log an LLM interaction
 * @param entry - Log entry data
 * @returns The ID of the created log entry
 */
export async function logLLMInteraction(entry: LLMLogEntry): Promise<number | null> {
  try {
    // Insert the log entry
    const [result] = await db.insert(insightLogs).values({
      success: entry.success,
      durationMs: entry.durationMs,
      error: entry.error,
      role: entry.role,
      promptVersion: entry.promptVersion,
      rawResponse: entry.rawResponse ? JSON.stringify(entry.rawResponse) : null,
      rawPrompt: entry.rawPrompt,
      apiKeyHint: entry.apiKeyHint,
      userId: entry.userId,
      model: entry.model,
      promptTokens: entry.promptTokens,
      completionTokens: entry.completionTokens,
      totalTokens: entry.totalTokens,
      cost: entry.cost,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    }).returning({ id: insightLogs.id });

    return result?.id || null;
  } catch (error) {
    logger.error('Failed to log LLM interaction:', error);
    return null;
  }
}

/**
 * Get LLM usage statistics for a time period
 * @param options - Query options
 * @returns Usage statistics
 */
export async function getLLMUsageStats(options: {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  model?: string;
}): Promise<{
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
}> {
  try {
    // Build the query conditions
    let conditions = sql`1=1`;
    
    if (options.startDate) {
      conditions = sql`${conditions} AND created_at >= ${options.startDate}`;
    }
    
    if (options.endDate) {
      conditions = sql`${conditions} AND created_at <= ${options.endDate}`;
    }
    
    if (options.userId) {
      conditions = sql`${conditions} AND user_id = ${options.userId}`;
    }
    
    if (options.model) {
      conditions = sql`${conditions} AND model = ${options.model}`;
    }
    
    // Execute the query
    const [result] = await db
      .select({
        totalRequests: sql`COUNT(*)`,
        successfulRequests: sql`SUM(CASE WHEN success = true THEN 1 ELSE 0 END)`,
        failedRequests: sql`SUM(CASE WHEN success = false THEN 1 ELSE 0 END)`,
        totalTokens: sql`SUM(COALESCE(total_tokens, 0))`,
        totalCost: sql`SUM(COALESCE(cost, 0))`,
        averageLatency: sql`AVG(COALESCE(duration_ms, 0))`,
      })
      .from(insightLogs)
      .where(conditions);
    
    return {
      totalRequests: Number(result?.totalRequests || 0),
      successfulRequests: Number(result?.successfulRequests || 0),
      failedRequests: Number(result?.failedRequests || 0),
      totalTokens: Number(result?.totalTokens || 0),
      totalCost: Number(result?.totalCost || 0),
      averageLatency: Number(result?.averageLatency || 0),
    };
  } catch (error) {
    logger.error('Failed to get LLM usage stats:', error);
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatency: 0,
    };
  }
}

/**
 * Get recent LLM interactions
 * @param options - Query options
 * @returns Array of log entries
 */
export async function getRecentLLMInteractions(options: {
  limit?: number;
  offset?: number;
  userId?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
}): Promise<LLMLogEntry[]> {
  try {
    // Build the query conditions
    let conditions = sql`1=1`;
    
    if (options.userId) {
      conditions = sql`${conditions} AND user_id = ${options.userId}`;
    }
    
    if (options.success !== undefined) {
      conditions = sql`${conditions} AND success = ${options.success}`;
    }
    
    if (options.startDate) {
      conditions = sql`${conditions} AND created_at >= ${options.startDate}`;
    }
    
    if (options.endDate) {
      conditions = sql`${conditions} AND created_at <= ${options.endDate}`;
    }
    
    // Execute the query
    const results = await db
      .select()
      .from(insightLogs)
      .where(conditions)
      .orderBy(sql`created_at DESC`)
      .limit(options.limit || 100)
      .offset(options.offset || 0);
    
    return results.map(row => ({
      id: row.id,
      createdAt: row.createdAt,
      success: row.success,
      durationMs: row.durationMs,
      error: row.error,
      role: row.role,
      promptVersion: row.promptVersion,
      rawResponse: row.rawResponse ? JSON.parse(row.rawResponse as string) : undefined,
      rawPrompt: row.rawPrompt,
      apiKeyHint: row.apiKeyHint,
      userId: row.userId,
      model: row.model,
      promptTokens: row.promptTokens,
      completionTokens: row.completionTokens,
      totalTokens: row.totalTokens,
      cost: row.cost,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }));
  } catch (error) {
    logger.error('Failed to get recent LLM interactions:', error);
    return [];
  }
}

/**
 * Calculate the cost of an LLM request based on token usage and model
 * @param model - The model used
 * @param promptTokens - Number of tokens in the prompt
 * @param completionTokens - Number of tokens in the completion
 * @returns The cost in USD
 */
export function calculateLLMCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Pricing per 1000 tokens as of May 2024
  const pricing: Record<string, { prompt: number; completion: number }> = {
    'gpt-4o': { prompt: 0.005, completion: 0.015 },
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    'gpt-3.5-turbo-16k': { prompt: 0.001, completion: 0.002 },
  };
  
  // Get the pricing for the model or use a default
  const modelPricing = pricing[model] || { prompt: 0.01, completion: 0.03 };
  
  // Calculate the cost
  const promptCost = (promptTokens / 1000) * modelPricing.prompt;
  const completionCost = (completionTokens / 1000) * modelPricing.completion;
  
  return promptCost + completionCost;
}
