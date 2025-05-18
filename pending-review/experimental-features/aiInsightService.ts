import { OpenAI } from 'openai';
import { createCircuitBreaker } from '../../../../utils/circuitBreaker.js';
import { logger } from '../../../../utils/logger.js';
import { db } from '../../../../shared/db.js';
import { insightLogs } from '../../../../shared/schema.js';
import { isError } from '../../../../utils/errorUtils.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
// Initialize OpenAI client with validation
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not configured');
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// Circuit breaker configuration
const insightBreaker = createCircuitBreaker('insight-generation', {
  failureThreshold: 5,
  recoveryTimeout: 5 * 60 * 1000, // 5 minutes
});
interface InsightGenerationOptions {
  role?: 'Executive' | 'Sales' | 'Lot';
  maxRetries?: number;
}
interface InsightResult {
  summary: string;
  value_insights: string[];
  actionable_flags: string[];
  confidence: 'high' | 'medium' | 'low';
  prompt_version?: string; // Added to track which prompt version was used
}
/**
 * Generate role-specific insights from report data
 */
export async function generateInsights(
  reportData: any,
  options: InsightGenerationOptions = {}
): Promise<InsightResult> {
  const { role = 'Executive', maxRetries = 3 } = options;
  // Load role-specific prompt
  const prompt = await loadRolePrompt(role);
  let attempt = 0;
  let lastError: Error | null = null;
  while (attempt < maxRetries) {
    try {
      // Check circuit breaker
      await insightBreaker.beforeRequest();
      const startTime = Date.now();
      // Prepare messages for OpenAI
      const messages = [
        { role: 'system', content: prompt.system },
        {
          role: 'user',
          content: JSON.stringify(reportData),
        },
      ];
      // Call OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      // Parse the response
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }
      const result = JSON.parse(content);
      // Add prompt version to the result
      result.prompt_version = prompt.version;
      // Log successful request with full details
      await logInsightGeneration({
        success: true,
        duration: Date.now() - startTime,
        role,
        prompt_version: prompt.version,
        raw_response: response,
        raw_prompt: JSON.stringify(messages),
      });
      return result as InsightResult;
    } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
      lastError = error as Error;
      attempt++;
      // Log failure
      await logInsightGeneration({
        success: false,
        error: isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error),
        role,
      });
      if (attempt === maxRetries) {
        insightBreaker.recordFailure();
        throw new Error(
          `Failed to generate insights after ${maxRetries} attempts: ${(error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))}`
        );
      }
      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
  throw lastError || new Error('Failed to generate insights');
}
// Get the directory name for prompt templates
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');
// Define prompt templates for different roles
const PROMPT_TEMPLATES = {
  Executive: {
    version: 'v1.0.0',
    system: `You are an expert automotive dealership analyst providing data-driven insights for executive-level decision making.
Focus on high-level business impact, strategic opportunities, and financial implications.
Your response must be a JSON object with this structure:
{
  "summary": "A concise 1-2 sentence overview of the key finding",
  "value_insights": ["Specific insight with metrics", "Another insight..."],
  "actionable_flags": ["Recommended action", "Another action..."],
  "confidence": "high" | "medium" | "low"
}`
  },
  Sales: {
    version: 'v1.0.0',
    system: `You are an expert automotive dealership analyst providing data-driven insights for sales managers.
Focus on sales performance, conversion rates, inventory turnover, and customer acquisition metrics.
Your response must be a JSON object with this structure:
{
  "summary": "A concise 1-2 sentence overview of the key finding",
  "value_insights": ["Specific insight with metrics", "Another insight..."],
  "actionable_flags": ["Recommended action", "Another action..."],
  "confidence": "high" | "medium" | "low"
}`
  },
  Lot: {
    version: 'v1.0.0',
    system: `You are an expert automotive dealership analyst providing data-driven insights for lot managers.
Focus on inventory aging, vehicle positioning, popular models, and lot optimization strategies.
Your response must be a JSON object with this structure:
{
  "summary": "A concise 1-2 sentence overview of the key finding",
  "value_insights": ["Specific insight with metrics", "Another insight..."],
  "actionable_flags": ["Recommended action", "Another action..."],
  "confidence": "high" | "medium" | "low"
}`
  }
};
/**
 * Load role-specific prompt template
 * First tries to load from filesystem, then falls back to in-memory templates
 */
async function loadRolePrompt(role: string): Promise<{ version: string; system: string }> {
  // Normalize role name
  const normalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  try {
    // Try to load from filesystem first
    const promptPath = path.join(PROMPTS_DIR, `${normalizedRole.toLowerCase()}_prompt.json`);
    // Check if the prompts directory exists, create if not
    if (!fs.existsSync(PROMPTS_DIR)) {
      fs.mkdirSync(PROMPTS_DIR, { recursive: true });
    }
    // Check if the prompt file exists
    if (fs.existsSync(promptPath)) {
      const promptData = fs.readFileSync(promptPath, 'utf8');
      return JSON.parse(promptData);
    }
    // If not found in filesystem, use in-memory template
    const template = PROMPT_TEMPLATES[normalizedRole as keyof typeof PROMPT_TEMPLATES];
    if (template) {
      // Save the template to filesystem for future use
      fs.writeFileSync(promptPath, JSON.stringify(template, null, 2));
      return template;
    }
    // Fall back to default template if role not found
    logger.warn(`No prompt template found for role: ${role}, using Executive template`);
    return PROMPT_TEMPLATES.Executive;
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    logger.error(`Error loading prompt template: ${errorMessage}`);
    return PROMPT_TEMPLATES.Executive;
  }
}
/**
 * Log insight generation attempt to DB
 */
async function logInsightGeneration(data: {
  success: boolean;
  duration?: number;
  error?: string;
  role: string;
  prompt_version?: string;
  raw_response?: any;
  raw_prompt?: string;
}) {
  try {
    // Get last 4 chars of API key for debugging (if available)
    const apiKey = process.env.OPENAI_API_KEY || '';
    const apiKeyHint = apiKey.length > 4 ? apiKey.slice(-4) : '';
    // Insert into insight_logs table using Drizzle ORM
    await db.insert(insightLogs).values({
      success: data.success,
      durationMs: data.duration || null,
      error: data.error || null,
      role: data.role,
      promptVersion: data.prompt_version || null,
      rawResponse: data.raw_response ? JSON.stringify(data.raw_response) : null,
      rawPrompt: data.raw_prompt || null,
      apiKeyHint: apiKeyHint || null,
    });
    logger.info(
      {
        event: 'insight_generation_logged',
        success: data.success,
        role: data.role,
        duration: data.duration,
      },
      `Logged insight generation: ${data.success ? 'success' : 'failure'}`
    );
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    logger.error(
      {
        event: 'insight_log_error',
        error: errorMessage,
      },
      `Failed to log insight generation: ${errorMessage}`
    );
  }
}
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
