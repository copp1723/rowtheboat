/**
 * Prompts Module
 *
 * This module exports all prompt-related functionality for the application.
 * It provides a centralized way to access system prompts and prompt routing logic.
 */
// Export specific prompts with their versions
export {
  automotiveAnalystSystemPrompt,
  promptVersion as automotiveAnalystPromptVersion,
} from './automotiveAnalystPrompt';
// Export prompt router functionality
export {
  getPromptByIntent,
  getPromptTextByIntent,
  getAvailableIntents,
  isValidIntent,
  routerVersion,
  type PromptIntent,
  type PromptInfo,
} from './promptRouter';
/**
 * Describes the expected structure of insight responses
 */
export interface InsightResponse {
  title: string; // Concise title describing the key insight
  description: string; // Detailed explanation with supporting data
  actionItems: string[]; // 3-5 specific actionable recommendations
  dataPoints?: Record<string, any>; // Optional additional structured data
}
/**
 * Parameters for a generic insight generation request
 */
export interface InsightGenerationParams {
  data: string; // The data to analyze (CSV, JSON, etc.)
  intent: string; // The analysis intent (e.g., 'automotive_analysis')
  dataFormat?: string; // Format of the input data (e.g., 'csv', 'json')
  contextInfo?: Record<string, any>; // Optional additional context
}
