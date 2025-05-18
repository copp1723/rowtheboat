/**
 * Scheduler Service
 * Manages and executes scheduled workflows based on cron expressions
 */
import { db } from '../shared/db.js';
import { getErrorMessage } from '../utils/errorUtils.js';
import { schedules, taskLogs } from '../shared/schema.js';
import { runWorkflow, getWorkflow } from './workflowService.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { enqueueJob } from './jobQueue.js';
import logger from '../utils/logger.js';

// Define Schedule type based on the database schema
export interface Schedule {
  id: string;
  userId: string | null;
  workflowId: string | null;
  intent: string | null;
  platform: string | null;
  cron: string;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  status: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
// Map to keep track of active schedules and their node-cron tasks
const activeSchedules = new Map<string, ReturnType<typeof cron.schedule>>();
/**
 * Initialize the scheduler on application startup
 * Loads all enabled schedules from the database and starts them
 */
export async function initializeScheduler(): Promise<void> {
  try {
    logger.info(
      { event: 'scheduler_service_init', timestamp: new Date().toISOString() },
      'Initializing scheduler service'
    );
    // Load all enabled schedules
    const enabledSchedules = await db.select().from(schedules).where(eq(schedules.enabled, true));
    logger.info(
      {
        event: 'scheduler_service_enabled_count',
        count: enabledSchedules.length,
        timestamp: new Date().toISOString(),
      },
      'Found enabled schedules count'
    );
    // Start each schedule with proper error handling
    const startupErrors = [];
    for (const schedule of enabledSchedules) {
      try {
        // Validate the cron expression before attempting to start
        if (!cron.validate(schedule.cron)) {
          logger.error(
            {
              event: 'schedule_invalid_cron',
              scheduleId: schedule.id,
              cron: schedule.cron,
              timestamp: new Date().toISOString(),
            },
            'Invalid cron expression for schedule'
          );
          // Disable invalid schedules
          await db
            .update(schedules)
            .set({
              enabled: false,
              updatedAt: new Date(),
            })
            .where(eq(schedules.id, schedule.id));
          startupErrors.push(`Schedule ${schedule.id}: Invalid cron expression`);
          continue;
        }
        // Try to start the schedule
        await startSchedule(schedule);
      } catch (error) {
        let errorMessage = getErrorMessage(error);
        logger.error(
          {
            event: 'schedule_service_start_failed',
            scheduleId: schedule.id,
            errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          },
          'Failed to start schedule'
        );
        startupErrors.push(`Schedule ${schedule.id}: ${errorMessage}`);
        // Continue with other schedules even if this one fails
      }
    }
    if (startupErrors.length > 0) {
      logger.warn(
        {
          event: 'scheduler_service_startup_errors',
          errors: startupErrors,
          timestamp: new Date().toISOString(),
        },
        `Scheduler initialized with startup errors`
      );
    } else {
      logger.info(
        { event: 'scheduler_service_init_complete', timestamp: new Date().toISOString() },
        'Scheduler initialized successfully'
      );
    }
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'scheduler_service_init_error',
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error initializing scheduler service'
    );
    throw error;
  }
}
/**
 * Create a new schedule for a workflow
 */
export async function createSchedule(
  workflowId: string,
  cronExpression: string,
  enabled: boolean = true
): Promise<Schedule> {
  try {
    // Validate the cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
    // Validate that the workflow exists
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    // Create the schedule
    const [newSchedule] = await db
      .insert(schedules)
      .values({
        id: uuidv4(),
        workflowId,
        cron: cronExpression,
        enabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    // If the schedule is enabled, start it right away
    if (enabled) {
      await startSchedule(newSchedule);
    }
    return newSchedule;
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'schedule_service_create_error',
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error creating schedule'
    );
    throw error;
  }
}
/**
 * Get a schedule by ID
 */
export async function getSchedule(scheduleId: string): Promise<Schedule | undefined> {
  try {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId.toString()));
    return schedule;
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'schedule_service_get_error',
        scheduleId,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error getting schedule'
    );
    throw error;
  }
}
/**
 * List all schedules
 */
export async function listSchedules(): Promise<Schedule[]> {
  try {
    return await db.select().from(schedules).orderBy(schedules.createdAt);
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'schedule_service_list_error',
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error listing schedules'
    );
    throw error;
  }
}
/**
 * Update a schedule
 */
export async function updateSchedule(
  scheduleId: string,
  updates: {
    cronExpression?: string;
    enabled?: boolean;
  }
): Promise<Schedule | undefined> {
  try {
    // Get the current schedule
    const currentSchedule = await getSchedule(scheduleId);
    if (!currentSchedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    // Prepare updates
    const updateValues: Partial<Schedule> = {
      updatedAt: new Date(),
    };
    if (updates.cronExpression) {
      // Validate the new cron expression
      if (!cron.validate(updates.cronExpression)) {
        throw new Error(`Invalid cron expression: ${updates.cronExpression}`);
      }
      updateValues.cron = updates.cronExpression;
    }
    if (updates.enabled !== undefined) {
      updateValues.enabled = updates.enabled;
    }
    // Update the schedule in the database
    const [updatedSchedule] = await db
      .update(schedules)
      .set(updateValues)
      .where(eq(schedules.id, scheduleId.toString()))
      .returning();
    if (!updatedSchedule) {
      throw new Error(`Failed to update schedule: ${scheduleId}`);
    }
    // Stop the existing schedule if it's active
    if (activeSchedules.has(scheduleId)) {
      await stopSchedule(scheduleId);
    }
    // Start the schedule if it's enabled
    if (updatedSchedule.enabled) {
      await startSchedule(updatedSchedule);
    }
    return updatedSchedule;
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'schedule_service_update_error',
        scheduleId,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error updating schedule'
    );
    throw error;
  }
}
/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<boolean> {
  try {
    // Stop the schedule if it's active
    if (activeSchedules.has(scheduleId)) {
      await stopSchedule(scheduleId);
    }
    // Delete the schedule from the database
    const [deletedSchedule] = await db
      .delete(schedules)
      .where(eq(schedules.id, scheduleId.toString()))
      .returning();
    return !!deletedSchedule;
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'schedule_service_delete_error',
        scheduleId,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error deleting schedule'
    );
    throw error;
  }
}
/**
 * Start a schedule
 */
export async function startSchedule(schedule: Schedule): Promise<void> {
  try {
    // If the schedule is already active, stop it first
    if (activeSchedules.has(schedule.id)) {
      await stopSchedule(schedule.id);
    }
    logger.info(
      {
        event: 'schedule_service_start_schedule',
        scheduleId: schedule.id,
        cron: schedule.cron,
        timestamp: new Date().toISOString(),
      },
      'Starting schedule with cron'
    );
    // Create a node-cron task with proper error handling and timezone configuration
    try {
      // Configure with UTC timezone to avoid timezone-related errors
      const options = {
        scheduled: true,
        timezone: 'UTC',
      };
      const task = cron.schedule(
        schedule.cron,
        async () => {
          try {
            await executeScheduledWorkflow(schedule);
          } catch (executionError) {
            logger.error(
              {
                event: 'schedule_service_execute_error',
                scheduleId: schedule.id,
                errorMessage: getErrorMessage(executionError),
                stack: executionError instanceof Error ? executionError.stack : undefined,
                timestamp: new Date().toISOString(),
              },
              'Error executing scheduled workflow'
            );
            // Log error but don't kill the scheduler
          }
        },
        options
      );
      // Store the task in our active schedules map
      activeSchedules.set(schedule.id, task);
      logger.info(
        {
          event: 'schedule_service_start_schedule_success',
          scheduleId: schedule.id,
          timestamp: new Date().toISOString(),
        },
        'Schedule started successfully'
      );
    } catch (cronError) {
      logger.error(
        {
          event: 'schedule_service_start_schedule_error',
          scheduleId: schedule.id,
          errorMessage: getErrorMessage(cronError),
          stack: cronError instanceof Error ? cronError.stack : undefined,
          timestamp: new Date().toISOString(),
        },
        'Failed to create cron job for schedule'
      );
      // Update the schedule to be disabled due to invalid cron expression
      await db
        .update(schedules)
        .set({
          enabled: false,
          updatedAt: new Date(),
        })
        .where(eq(schedules.id, schedule.id));
      throw new Error(`Invalid cron expression or time value: ${schedule.cron}`);
    }
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'schedule_service_start_error',
        scheduleId: schedule.id,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error starting schedule'
    );
    throw error;
  }
}
/**
 * Stop a schedule
 */
export async function stopSchedule(scheduleId: string): Promise<void> {
  try {
    const task = activeSchedules.get(scheduleId);
    if (task) {
      logger.info(
        {
          event: 'schedule_service_stop_schedule',
          scheduleId,
          timestamp: new Date().toISOString(),
        },
        'Stopping schedule'
      );
      task.stop();
      activeSchedules.delete(scheduleId);
      logger.info(
        {
          event: 'schedule_service_stop_schedule_success',
          scheduleId,
          timestamp: new Date().toISOString(),
        },
        'Schedule stopped successfully'
      );
    }
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'schedule_service_stop_error',
        scheduleId,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error stopping schedule'
    );
    throw error;
  }
}
/**
 * Execute a scheduled workflow
 */
async function executeScheduledWorkflow(schedule: Schedule): Promise<void> {
  try {
    logger.info(
      {
        event: 'schedule_service_execute_workflow',
        scheduleId: schedule.id,
        workflowId: schedule.workflowId!,
        timestamp: new Date().toISOString(),
      },
      'Executing scheduled workflow'
    );
    // Update the lastRunAt timestamp
    await db
      .update(schedules)
      .set({
        lastRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, schedule.id));
    // Execute the workflow using the job queue for better reliability
    // Create a task log entry for this scheduled run
    const taskId = uuidv4();
    // Create a task log entry
    try {
      await db.insert(taskLogs).values({
        id: taskId,
        taskType: 'scheduledWorkflow',
        taskText: `Run scheduled workflow: ${schedule.workflowId!}`,
        taskData: {
          scheduleId: schedule.id,
          workflowId: schedule.workflowId!,
          cron: schedule.cron,
        },
        status: 'pending',
        createdAt: new Date(),
      });
    } catch (insertError) {
      // If there was an error with the insert, try a different approach
      logger.error(
        {
          event: 'schedule_service_task_log_insert_error',
          scheduleId: schedule.id,
          workflowId: schedule.workflowId!,
          errorMessage: getErrorMessage(insertError),
          stack: insertError instanceof Error ? insertError.stack : undefined,
          timestamp: new Date().toISOString(),
        },
        'Error inserting task log, trying alternative approach'
      );
      // Try with user_id if that's what's missing (detected from logs)
      try {
        await db.insert(taskLogs).values({
          id: taskId,
          taskType: 'scheduledWorkflow',
          taskText: `Run scheduled workflow: ${schedule.workflowId!}`,
          taskData: {
            scheduleId: schedule.id,
            workflowId: schedule.workflowId!,
            cron: schedule.cron,
          },
          status: 'pending',
          createdAt: new Date(),
          // Add user_id if schema requires it
          userId: 'system-scheduler',
        });
      } catch (secondError) {
        logger.error(
          {
            event: 'schedule_service_task_log_insert_error_second_attempt',
            scheduleId: schedule.id,
            workflowId: schedule.workflowId!,
            errorMessage: getErrorMessage(secondError),
            stack: secondError instanceof Error ? secondError.stack : undefined,
            timestamp: new Date().toISOString(),
          },
          'Second attempt at inserting task log failed'
        );
        throw secondError; // Re-throw the error to be caught by the outer catch
      }
    }
    // Enqueue the job with the task ID
    await enqueueJob(taskId, 5); // Priority 5 for scheduled jobs
    logger.info(
      {
        event: 'schedule_service_execute_workflow_queued',
        scheduleId: schedule.id,
        workflowId: schedule.workflowId!,
        taskId,
        timestamp: new Date().toISOString(),
      },
      'Scheduled workflow execution queued'
    );
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'schedule_service_execute_workflow_error',
        scheduleId: schedule.id,
        workflowId: schedule.workflowId!,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error executing scheduled workflow'
    );
    // We don't throw here to prevent the scheduler from stopping on errors
  }
}
/**
 * Execute a scheduled workflow directly (called by job processor)
 */
export async function executeWorkflowById(workflowId: string): Promise<void> {
  try {
    // Check if the workflow is already running
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    // Skip if the workflow is already running or locked
    if (workflow.status === 'running' || workflow.locked) {
      logger.info(
        {
          event: 'schedule_service_execute_workflow_skip',
          workflowId,
          timestamp: new Date().toISOString(),
        },
        'Workflow is already running or locked, skipping execution'
      );
      return;
    }
    // Run the workflow
    const result = await runWorkflow(workflowId);
    logger.info(
      {
        event: 'schedule_service_execute_workflow_result',
        workflowId,
        status: result.status,
        timestamp: new Date().toISOString(),
      },
      'Scheduled workflow executed'
    );
    // Continue execution if the workflow is paused (multi-step workflow)
    if (result.status === 'paused') {
      logger.info(
        {
          event: 'schedule_service_execute_workflow_continue',
          workflowId,
          currentStep: result.currentStep,
          timestamp: new Date().toISOString(),
        },
        'Workflow is paused, continuing execution'
      );
      await runWorkflow(workflowId);
    }
  } catch (error) {
    let errorMessage = getErrorMessage(error);
    logger.error(
      {
        event: 'schedule_service_execute_workflow_by_id_error',
        workflowId,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      'Error executing workflow'
    );
    throw error;
  }
}
