import { sql } from 'drizzle-orm';
import { EkoTool } from '../../../../tools/extractCleanContent.js';
import { db } from '../../../../shared/db.js';
import { plans } from '../../../../shared/schema.js';
import { eq, sql } from 'drizzle-orm';
// Define steps table schema inline until added to main schema
const steps = {
  id: 'id',
  planId: 'plan_id',
};
export interface PlanStep {
  tool: string;
  input: Record<string, any>;
}
export interface ExecutionPlan {
  steps: PlanStep[];
  planId?: string; // Optional plan ID for tracking in the database
  taskText?: string; // Original task text
}
export interface StepResult {
  output: any;
  error?: string;
  stepId?: string; // Identifier for the step in the database
}
/**
 * Executes a multi-step plan by running each tool in sequence
 * and passing outputs between steps as needed
 *
 * @param plan - The execution plan with steps to run
 * @param tools - Map of available tools by name
 * @returns The result of the final step or all step results
 */
export async function executePlan(
  plan: ExecutionPlan,
  tools: Record<string, EkoTool>
): Promise<{ finalOutput: any; stepResults: StepResult[]; planId: string }> {
  const stepResults: StepResult[] = [];
  try {
    // Create a new plan entry in the database
    let planId = plan.planId;
    if (!planId) {
      const [newPlan] = await // @ts-ignore
      db
        .insert(plans)
        .values({
          task: plan.taskText || 'Unknown task',
        })
        .returning({ id: sql`${plans.id}` });
      planId = String(newPlan.id);
      console.log(`Created new plan in database with ID: ${planId}`);
    }
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      console.log(`Executing step ${i}: ${step.tool}`);
      // Get the tool for this step
      const tool = tools[step.tool];
      if (!tool) {
        throw new Error(`Tool not found: ${step.tool}`);
      }
      // Process input template variables (e.g., {{step0.output}})
      const processedInput = processInputTemplates(step.input, stepResults);
      // Create step record in database with pending status
      const [stepRecord] = await // @ts-ignore
      db
        .insert(steps)
        .values({
          planId: planId,
          stepIndex: i,
          tool: step.tool,
          input: processedInput,
          status: 'pending',
        })
        .returning({ id: sql`${steps.id}` });
      const stepId = stepRecord.id;
      console.log(`Created step record with ID: ${stepId}`);
      try {
        // Execute the tool with processed inputs
        const output = await tool.handler(processedInput);
        // Update step in database with success status and output
        await // @ts-ignore
        db
          .update(steps)
          .set({
            output: output,
            status: 'completed',
          })
          .where(eq(steps.id, stepId.toString()));
        stepResults.push({ output, stepId });
        console.log(`Step ${i} completed successfully`);
      } catch (error) {
        console.error(`Error in step ${i}:`, error);
        const errorMessage =
          error instanceof Error
            ? error instanceof Error
              ? error instanceof Error
                ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                : String(error)
              : String(error)
            : String(error);
        // Update step in database with error status
        await // @ts-ignore
        db
          .update(steps)
          .set({
            status: 'failed',
            error: errorMessage,
          })
          .where(eq(steps.id, stepId.toString()));
        stepResults.push({
          output: null,
          error: errorMessage,
          stepId,
        });
        // Don't break execution on error, but log it
      }
    }
    // Return the final output and all step results
    return {
      finalOutput: stepResults[stepResults.length - 1]?.output,
      stepResults,
      planId,
    };
  } catch (error) {
    console.error('Error executing plan:', error);
    throw error;
  }
}
/**
 * Processes input templates by replacing variables with actual values
 * from previous step results
 *
 * @param input - The input object with potential template variables
 * @param stepResults - Results from previous steps
 * @returns Processed input with templates replaced by actual values
 */
function processInputTemplates(
  input: Record<string, any>,
  stepResults: StepResult[]
): Record<string, any> {
  const processed: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      // Match template patterns like {{step0.output}} or {{step0.output.property.subprop}}
      const templateRegex = /{{step(\d+)\.output(\.[\w\.]+)?}}/g;
      let processedValue = value;
      // Replace all template references with actual values
      processedValue = processedValue.replace(templateRegex, (_match, stepIndex, propertyPath) => {
        const index = parseInt(stepIndex, 10);
        if (index < 0 || index >= stepResults.length) {
          throw new Error(`Invalid step reference: step${index}`);
        }
        let result = stepResults[index].output;
        // If a property path is specified, traverse the object
        if (propertyPath) {
          // Remove leading dot and split by dots
          const props = propertyPath.substring(1).split('.');
          // Navigate through the properties
          try {
            for (const prop of props) {
              if (!result || typeof result !== 'object') {
                throw new Error(`Cannot access property '${prop}' of non-object value`);
              }
              result = result[prop];
            }
          } catch (e) {
            console.warn(
              `Failed to access property path ${propertyPath} in step ${index} output:`,
              e
            );
            // Return empty string for failed property access
            return '';
          }
        }
        // If the result is an object or array, stringify it
        if (typeof result === 'object' && result !== null) {
          return JSON.stringify(result);
        }
        return String(result);
      });
      // If the entire value was a template, try to parse it back to an object
      if (processedValue !== value && value.match(/^{{step\d+\.output(\.[\w\.]+)?}}$/)) {
        try {
          // For special case where the whole value is a template reference
          // Check if we should just pass through the original value
          const match = value.match(/{{step(\d+)\.output(\.[\w\.]+)?}}/);
          if (match) {
            const index = parseInt(match[1], 10);
            const propertyPath = match[2];
            let result = stepResults[index].output;
            // If a property path is specified, traverse the object
            if (propertyPath) {
              // Remove leading dot and split by dots
              const props = propertyPath.substring(1).split('.');
              // Navigate through the properties
              try {
                for (const prop of props) {
                  if (!result || typeof result !== 'object') {
                    throw new Error(`Cannot access property '${prop}' of non-object value`);
                  }
                  result = result[prop];
                }
              } catch (e) {
                // If property access fails, just use the processed value as is
                continue;
              }
            }
            // If it's an object, pass it directly instead of as a string
            if (typeof result === 'object' && result !== null) {
              processed[key] = result;
              continue;
            }
          }
          // Otherwise try to parse it as JSON (if it looks like JSON)
          const firstChar = processedValue.trim()[0];
          if (firstChar === '{' || firstChar === '[') {
            processed[key] = JSON.parse(processedValue);
            continue;
          }
        } catch (e) {
          // If parsing fails, use as string
        }
      }
      processed[key] = processedValue;
    } else if (typeof value === 'object' && value !== null) {
      // Recursively process nested objects
      processed[key] = processInputTemplates(value, stepResults);
    } else {
      // Pass through other values unchanged
      processed[key] = value;
    }
  }
  return processed;
}
