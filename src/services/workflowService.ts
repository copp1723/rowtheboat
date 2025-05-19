/**
 * Workflow Service
 * Handles multi-step workflows with memory, state transitions, and resumability
 */
import { db } from '../shared/db.js';
import { isError } from '../utils/errorUtils.js';
import { workflows, WorkflowStatus, WorkflowStep, Workflow } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
// Import step handlers
import { stepHandlers } from './stepHandlers';
// Import email service
import { sendWorkflowCompletionEmail } from './workflowEmailServiceFixed';
// Import logger
import { debug, info, warn, error } from '../shared/logger.js';
/**
 * Create a new workflow
 */
export async function createWorkflow(
  steps: WorkflowStep[],
  initialContext: Record<string, any> = {},
  userId?: string
): Promise<Workflow> {
  try {
    // Validate steps
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }
    // Make sure each step has a unique ID
    const stepsWithIds = steps.map((step) => ({
      ...step,
      id: step.id || uuidv4(),
    }));
    // Create the workflow
    const [workflow] = await db.insert(workflows).values({
      userId,
      steps: stepsWithIds,
      currentStep: 0,
      context: initialContext,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any); // Ensuring all required properties are provided.returning();
    info(
      {
        event: 'workflow_created',
        workflowId: workflow.id,
        stepsCount: stepsWithIds.length,
        timestamp: new Date().toISOString(),
      },
      'Workflow created'
    );
    return workflow;
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw error;
  }
}
/**
 * Run a workflow step
 */
export async function runWorkflow(workflowId: string): Promise<Workflow> {
  try {
    // Get the workflow
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId.toString()));
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    // Check if workflow is already locked
    if (workflow.locked) {
      const lockedTime = workflow.lockedAt ? new Date(workflow.lockedAt).getTime() : 0;
      const currentTime = new Date().getTime();
      // If locked for more than 5 minutes, consider it stale and continue
      if (currentTime - lockedTime < 5 * 60 * 1000) {
        throw new Error(`Workflow ${workflowId} is currently locked`);
      }
    }
    // If workflow is completed or failed, don't run again
    if (workflow.status === 'completed' || workflow.status === 'failed') {
      return workflow;
    }
    // Lock the workflow
    const [updatedWorkflow] = await db
      .update(workflows)
      .set({
        locked: true,
        lockedAt: new Date(),
        status: 'running',
        updatedAt: new Date(),
      })
      .where(and(eq(workflows.id, workflowId.toString()), eq(workflows.locked, false)))
      .returning();
    // If we couldn't update (lock), another process might be running this
    if (!updatedWorkflow) {
      throw new Error(`Could not lock workflow ${workflowId} for execution`);
    }
    // Parse the steps as JSON
    const steps: WorkflowStep[] = Array.isArray(updatedWorkflow.steps)
      ? (updatedWorkflow.steps as WorkflowStep[])
      : (JSON.parse(updatedWorkflow.steps as unknown as string) as WorkflowStep[]);
    // Execute the current step
    const currentStepIndex = updatedWorkflow.currentStep;
    if (currentStepIndex >= steps.length) {
      // Mark as completed if all steps are done
      const [finalWorkflow] = await db
        .update(workflows)
        .set({
          status: 'completed',
          locked: false,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, workflowId.toString()))
        .returning();
      // Send completion email if workflow has a notification email configured
      try {
        // First try to send using the new email notification system
        const result = await sendWorkflowCompletionEmail(finalWorkflow.id);
        // Define a type for the expected response object
        interface EmailResult {
          success: boolean;
          message?: string;
          error?: string;
          emailId?: string;
        }
        if (typeof result === 'boolean') {
          // Handle old boolean return type for backwards compatibility
          if (!result) {
            // Fall back to context-based notifications
            const context = finalWorkflow.context
              ? typeof finalWorkflow.context === 'string'
                ? JSON.parse(finalWorkflow.context)
                : (finalWorkflow.context as Record<string, any>)
              : {};
            // If notification emails are configured in context, send completion email
            if (context.notifyEmail) {
              const recipients = Array.isArray(context.notifyEmail)
                ? context.notifyEmail
                : [context.notifyEmail];
              debug(
                {
                  event: 'email_completion_sending',
                  workflowId,
                  recipients,
                  timestamp: new Date().toISOString(),
                },
                'Sending workflow completion email'
              );
              await sendWorkflowCompletionEmail(finalWorkflow.id, recipients);
            }
          }
        } else {
          // Cast the result to the defined type to ensure TypeScript is happy
          const emailResult = result as EmailResult;
          // Handle object return type with success property
          if (emailResult && !emailResult.success) {
            // Fall back to context-based notifications
            const context = finalWorkflow.context
              ? typeof finalWorkflow.context === 'string'
                ? JSON.parse(finalWorkflow.context)
                : (finalWorkflow.context as Record<string, any>)
              : {};
            // If notification emails are configured in context, send completion email
            if (context.notifyEmail) {
              const recipients = Array.isArray(context.notifyEmail)
                ? context.notifyEmail
                : [context.notifyEmail];
              debug(
                {
                  event: 'email_completion_sending',
                  workflowId,
                  recipients,
                  timestamp: new Date().toISOString(),
                },
                'Sending workflow completion email'
              );
              await sendWorkflowCompletionEmail(finalWorkflow.id, recipients);
            }
          } else if (emailResult && emailResult.message) {
            info(
              {
                event: 'email_completion_sent',
                workflowId,
                messageId: emailResult.message,
                timestamp: new Date().toISOString(),
              },
              'Workflow completion email sent'
            );
          }
        }
      } catch (emailError) {
        // Log the error but don't fail the workflow
        console.error(`Failed to send completion email for workflow ${workflowId}:`, emailError);
      }
      return finalWorkflow;
    }
    const currentStep = steps[currentStepIndex];
    try {
      // Get the handler for this step type
      const handler = stepHandlers[currentStep.type];
      if (!handler) {
        throw new Error(`No handler found for step type ${currentStep.type}`);
      }
      debug(
        {
          event: 'step_execution_start',
          workflowId,
          stepIndex: currentStepIndex + 1,
          totalSteps: steps.length,
          stepName: currentStep.name,
          timestamp: new Date().toISOString(),
        },
        'Executing workflow step'
      );
      // Execute the step - ensure context is an object
      const context = updatedWorkflow.context
        ? typeof updatedWorkflow.context === 'string'
          ? JSON.parse(updatedWorkflow.context)
          : (updatedWorkflow.context as Record<string, any>)
        : {};
      const stepResult = await handler(currentStep.config, context);
      // Merge the step result into the context
      const newContext = {
        ...(context || {}),
        [currentStep.id]: stepResult,
        __lastStepResult: stepResult, // Store the last step result for easy access
      };
      // Update the workflow
      const [newWorkflow] = await db
        .update(workflows)
        .set({
          currentStep: currentStepIndex + 1,
          context: newContext,
          status: currentStepIndex + 1 >= steps.length ? 'completed' : 'paused',
          locked: false,
          updatedAt: new Date(),
          lastUpdated: new Date(),
        })
        .where(eq(workflows.id, workflowId.toString()))
        .returning();
      return newWorkflow;
    } catch (error) {
      // Handle step error
      console.error(`Error executing step ${currentStepIndex + 1}/${steps.length}:`, error);
      // Determine if we should retry the step
      let shouldRetry = false;
      let retryBackoff = 0;
      if (currentStep.maxRetries && currentStep.retries !== undefined) {
        if (currentStep.retries < currentStep.maxRetries) {
          shouldRetry = true;
          // Calculate exponential backoff if specified
          if (currentStep.backoffFactor) {
            retryBackoff = Math.pow(currentStep.backoffFactor, currentStep.retries) * 1000;
          }
          // Update retry count in the steps
          steps[currentStepIndex].retries = (currentStep.retries || 0) + 1;
        }
      }
      // Update the workflow with error information
      const [failedWorkflow] = await db
        .update(workflows)
        .set({
          steps: steps,
          status: shouldRetry ? 'paused' : 'failed',
          lastError:
            error instanceof Error
              ? error instanceof Error
                ? error instanceof Error
                  ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                  : String(error)
                : String(error)
              : String(error),
          locked: false,
          updatedAt: new Date(),
          lastUpdated: new Date(),
          ...(shouldRetry && retryBackoff > 0
            ? { lockedAt: new Date(Date.now() + retryBackoff) }
            : {}),
        })
        .where(eq(workflows.id, workflowId.toString()))
        .returning();
      return failedWorkflow;
    }
  } catch (error) {
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
      // Use type-safe error handling
      const errorMessage = isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
        : String(error)
      : String(error);
    // Use type-safe error handling
    const errorMessage = isError(error)
      ? error instanceof Error
        ? isError(error)
          ? error instanceof Error
            ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
            : String(error)
          : String(error)
        : String(error)
      : String(error);
    console.error('Error running workflow:', error);
    // Ensure we unlock the workflow in case of error
    try {
      await db
        .update(workflows)
        .set({
          locked: false,
          lastError:
            error instanceof Error
              ? isError(error)
                ? error instanceof Error
                  ? isError(error)
                    ? error instanceof Error
                      ? isError(error) ? (error instanceof Error ? isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error) : String(error)) : String(error)
                      : String(error)
                    : String(error)
                  : String(error)
                : String(error)
              : String(error),
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, workflowId.toString()));
    } catch (unlockError) {
      console.error('Error unlocking workflow:', unlockError);
    }
    throw error;
  }
}
/**
 * Get a workflow by ID
 */
export async function getWorkflow(workflowId: string): Promise<Workflow | null> {
  try {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId.toString()));
    return workflow || null;
  } catch (error) {
    console.error('Error getting workflow:', error);
    throw error;
  }
}
/**
 * List workflows with optional filtering
 */
export async function listWorkflows(
  status?: WorkflowStatus,
  userId?: string,
  limit: number = 100
): Promise<Workflow[]> {
  try {
    let whereConditions = [];
    // Add filters if provided
    if (status) {
      whereConditions.push(eq(workflows.status, status));
    }
    if (userId) {
      whereConditions.push(eq(workflows.userId!, userId));
    }
    // Execute query with appropriate conditions
    if (whereConditions.length > 0) {
      // Apply all filters using AND
      return db
        .select()
        .from(workflows)
        .where(and(...whereConditions))
        .limit(limit);
    } else {
      // No filters, return all workflows up to limit
      return db.select().from(workflows).limit(limit);
    }
  } catch (error) {
    console.error('Error listing workflows:', error);
    throw error;
  }
}
/**
 * Reset a workflow to its initial state
 */
export async function resetWorkflow(workflowId: string): Promise<Workflow> {
  try {
    const [workflow] = await db
      .update(workflows)
      .set({
        currentStep: 0,
        status: 'pending',
        lastError: null,
        locked: false,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId.toString()))
      .returning();
    return workflow;
  } catch (error) {
    console.error('Error resetting workflow:', error);
    throw error;
  }
}
/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string): Promise<boolean> {
  try {
    const result = await db.delete(workflows).where(eq(workflows.id, workflowId.toString()));
    return true;
  } catch (error) {
    console.error('Error deleting workflow:', error);
    throw error;
  }
}
/**
 * Get workflows (optionally filtered by status and user ID)
 */
export async function getWorkflows(status?: string, userId?: string | null): Promise<Workflow[]> {
  try {
    // Build the query with filters
    let query = db.select().from(workflows);
    // Apply filters conditionally
    const conditions: any[] = [];
    if (status) {
      conditions.push(eq(workflows.status, status as WorkflowStatus));
    }
    if (userId) {
      conditions.push(eq(workflows.userId!, userId));
    }
    // Apply all conditions if we have any
    if (conditions.length === 1) {
      // Cast the query to any to bypass the type error
      // This is safe because we know the structure of the query
      query = (query as any).where(conditions[0]);
    } else if (conditions.length > 1) {
      // Cast the query to any to bypass the type error
      query = (query as any).where(and(...conditions));
    }
    // Execute the query with ordering
    const results = await query.orderBy(workflows.createdAt);
    // Return the results in reverse chronological order
    return results.reverse();
  } catch (error) {
    console.error('Error getting workflows:', error);
    throw error;
  }
}
/**
 * Configure email notifications for a workflow
 * @param workflowId The ID of the workflow
 * @param emails A single email address or array of email addresses
 * @param options Additional options for notifications
 * @returns The updated workflow with notification settings
 */
export async function configureWorkflowNotifications(
  workflowId: string,
  emails: string | string[],
  options: { sendOnCompletion?: boolean; sendOnFailure?: boolean } = {}
): Promise<Workflow> {
  try {
    // Get the workflow
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId.toString()));
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    // Process email to get a single recipient
    const recipientEmail = Array.isArray(emails) ? emails[0] : emails;
    // For backward compatibility, also store in context
    const context = workflow.context
      ? typeof workflow.context === 'string'
        ? JSON.parse(workflow.context)
        : (workflow.context as Record<string, any>)
      : {};
    // Update the context with notification emails for legacy support
    const updatedContext = {
      ...context,
      notifyEmail: emails,
    };
    // Update the workflow context
    const [updatedWorkflow] = await db
      .update(workflows)
      .set({
        context: updatedContext,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId.toString()))
      .returning();
    info(
      {
        event: 'workflow_notification_configured',
        workflowId,
        recipientEmail,
        timestamp: new Date().toISOString(),
      },
      'Configured workflow notifications'
    );
    return updatedWorkflow;
  } catch (error) {
    console.error('Error configuring workflow notifications:', error);
    throw error;
  }
}
