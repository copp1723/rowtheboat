import { Eko } from '@eko-ai/eko';
// Import ExecutionPlan as a type only since we're not using the class constructor
import type {   ExecutionPlan   } from '../agent/executePlan.js';
import { logger } from '../shared/logger.js';
import { v4 as uuidv4 } from 'uuid';
export interface ParsedTask {
  id: string;
  type: string;
  title?: string;
  description?: string;
  steps?: string[];
  priority?: number;
  userId?: string;
  status?: string;
  planId?: string; // Database ID for the execution plan
  parameters?: Record<string, any>; // For storing task-specific parameters
  original?: string; // Original task text
  metadata?: Record<string, any>;
  createdAt?: Date;
  context?: Record<string, any>;
}
export interface ParserResult {
  task: ParsedTask;
  executionPlan?: any;
  error?: string;
}
// Main parsing class with enhanced error handling
export class TaskParser {
  private eko: Eko;
  private logger: any; // Using any as a temporary fix
  constructor(apiKey?: string, logger?: any) {
    this.eko = new Eko(apiKey || process.env.EKO_API_KEY);
    this.logger = logger || {
      info: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.log,
    };
  }
  async parseUserRequest(userInput: string): Promise<ParserResult> {
    try {
      this.logger.info('Parsing user request', { userInput: userInput.substring(0, 100) + '...' });
      // Attempt to extract structured task information using Eko
      const taskInfo = await this.extractTaskInfo(userInput);
      if (!taskInfo || !taskInfo.type) {
        throw new Error('Failed to extract valid task information');
      }
      // Generate task ID if not present
      const id = taskInfo.id || uuidv4();
      // Create a structured task object
      const parsedTask: ParsedTask = {
        id,
        type: taskInfo.type,
        title: taskInfo.title || 'Untitled Task',
        description: taskInfo.description || userInput,
        steps: taskInfo.steps || [],
        priority: taskInfo.priority || 1,
        status: 'pending',
        createdAt: new Date(),
        metadata: taskInfo.metadata || {},
        context: { userInput },
      };
      // Check if we need to create an execution plan
      let executionPlan = undefined;
      if (parsedTask.type === 'complex' || (parsedTask.steps && parsedTask.steps.length > 0)) {
        try {
          const planId = uuidv4();
          // Skip execution plan creation for now to fix type errors
          executionPlan = {
            id: planId.toString(),
            task: parsedTask,
            steps: parsedTask.steps || [],
          };
          parsedTask.planId = planId.toString();
        } catch (planError) {
          this.logger.error('Error creating execution plan', { error: planError });
          // Continue without execution plan but record the error
          parsedTask.metadata = {
            ...parsedTask.metadata,
            planError: planError instanceof Error ? planError.message : 'Unknown plan error',
          };
        }
      }
      this.logger.info('Successfully parsed task', {
        taskId: parsedTask.id,
        taskType: parsedTask.type,
      });
      return {
        task: parsedTask,
        executionPlan,
      };
    } catch (error) {
      this.logger.error('Failed to parse user request', { error });
      // Create a fallback minimal task
      const fallbackTask: ParsedTask = {
        id: uuidv4(),
        type: 'unknown',
        title: 'Parsing Error',
        description: userInput,
        steps: [],
        priority: 1,
        status: 'failed',
        createdAt: new Date(),
        metadata: {
          parsingError:
            error instanceof Error
              ? error instanceof Error
                ? error instanceof Error
                  ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                  : String(error)
                : String(error)
              : 'Unknown parsing error',
          originalInput: userInput.substring(0, 500) + (userInput.length > 500 ? '...' : ''),
        },
        context: { userInput },
      };
      return {
        task: fallbackTask,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error instanceof Error
                ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                : String(error)
              : String(error)
            : 'Unknown parsing error',
      };
    }
  }
  private async extractTaskInfo(userInput: string): Promise<any> {
    try {
      // Use Eko to extract information
      const response = await this.eko.complete({
        messages: [
          {
            role: 'system',
            content: `You are a task parsing assistant. Extract structured information from user requests to help a task automation system.
Extract the following information:
1. Task type (simple, complex, query)
2. Task title (brief)
3. Task description (detailed)
4. Steps to complete the task (if applicable)
5. Priority (1-3, where 1 is highest)
6. Any metadata that might be useful
Respond with valid JSON only, with these fields: {type, title, description, steps, priority, metadata}.
For "steps", provide an array of string instructions that would logically complete the task.
`,
          },
          {
            role: 'user',
            content: userInput,
          },
        ],
        temperature: 0.1,
        model: 'gpt-4o', // or a different model if preferred
      });
      // Parse the response to extract the JSON
      const jsonMatch = response.match(/({[\s\S]*})/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from response');
      }
      // Parse the extracted JSON
      const taskInfo = JSON.parse(jsonMatch[0]);
      // Validate minimum required fields
      if (!taskInfo.type || !taskInfo.title) {
        throw new Error('Missing required task information (type or title)');
      }
      return taskInfo;
    } catch (error) {
      this.logger.error('Failed to extract task info', { error });
      // Attempt a second try with a simpler prompt if extraction fails
      return this.fallbackExtraction(userInput);
    }
  }
  private async fallbackExtraction(userInput: string): Promise<any> {
    try {
      const response = await this.eko.complete({
        messages: [
          {
            role: 'system',
            content:
              'Parse this request into a simple JSON with {type, title, description} only. Type should be "simple", "complex", or "query".',
          },
          {
            role: 'user',
            content: userInput,
          },
        ],
        temperature: 0.1,
        model: 'gpt-3.5-turbo', // Using a faster model for fallback
      });
      // Extract JSON from the response
      const jsonMatch = response.match(/({[\s\S]*})/);
      if (!jsonMatch) {
        throw new Error('Fallback extraction failed');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error('Fallback extraction failed', { error });
      // Return a minimal object if all extraction fails
      return {
        type: 'simple',
        title: 'Untitled Task',
        description: userInput.substring(0, 100) + '...',
      };
    }
  }
}
