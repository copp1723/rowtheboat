/**
 * API Routes for Task Scheduler
 * Handles CRUD operations for schedules and schedule execution
 */
import express from 'express';
import { isError } from '../utils/errorUtils.js';
import { z } from 'zod';
import { isAuthenticated } from '../auth.js';
import {
  createSchedule,
  getSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  retrySchedule,
  getScheduleLogs,
} from '../../services/scheduler.js';
const router = express.Router();
// Validation schemas
const createScheduleSchema = z.object({
  intent: z.string().min(1).max(100),
  platform: z.string().min(1).max(50),
  cronExpression: z.string().min(1),
  workflowId: z.string().uuid().optional(),
});
const updateScheduleSchema = z.object({
  cronExpression: z.string().min(1).optional(),
  status: z.enum(['active', 'paused', 'failed']).optional(),
  intent: z.string().min(1).max(100).optional(),
  platform: z.string().min(1).max(50).optional(),
});
// Middleware to validate schedule ID
const validateScheduleId = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const { id } = req.params;
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid schedule ID format' });
  }
  next();
};
// Create a new schedule
router.post('/', isAuthenticated, async (req: any, res) => {
  try {
    // Validate request body
    const validationResult = createScheduleSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }
    const { intent, platform, cronExpression, workflowId } = validationResult.data;
    // Create the schedule
    const schedule = await createSchedule({
      userId: req.user.claims.sub,
      intent,
      platform,
      cronExpression,
      workflowId,
    });
    res.status(201).json(schedule);
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
    console.error('Error creating schedule:', error);
    res.status(500).json({
      error: 'Failed to create schedule',
      message:
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
    });
  }
});
// Get all schedules for the authenticated user
router.get('/', isAuthenticated, async (req: any, res) => {
  try {
    // Extract query parameters
    const status = req.query.status as string;
    const platform = req.query.platform! as string;
    const intent = req.query.intent! as string;
    // List schedules with filtering
    const schedulesList = await listSchedules({
      userId: req.user.claims.sub,
      status,
      platform,
      intent,
    });
    res.json(schedulesList);
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
    console.error('Error listing schedules:', error);
    res.status(500).json({
      error: 'Failed to list schedules',
      message:
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
    });
  }
});
// Get a specific schedule by ID
router.get('/:id', isAuthenticated, validateScheduleId, async (req: any, res) => {
  try {
    const schedule = await getSchedule(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    // Check if the schedule belongs to the authenticated user
    if (schedule.userId! !== req.user.claims.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(schedule);
  } catch (error) {
    console.error(`Error getting schedule ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to get schedule',
      message:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : String(error),
    });
  }
});
// Update a schedule
router.put('/:id', isAuthenticated, validateScheduleId, async (req: any, res) => {
  try {
    // Get the schedule to check ownership
    const existingSchedule = await getSchedule(req.params.id);
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    // Check if the schedule belongs to the authenticated user
    if (existingSchedule.userId! !== req.user.claims.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Validate request body
    const validationResult = updateScheduleSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }
    // Update the schedule
    const updatedSchedule = await updateSchedule(req.params.id, validationResult.data);
    res.json(updatedSchedule);
  } catch (error) {
    console.error(`Error updating schedule ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to update schedule',
      message:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : String(error),
    });
  }
});
// Delete a schedule
router.delete('/:id', isAuthenticated, validateScheduleId, async (req: any, res) => {
  try {
    // Get the schedule to check ownership
    const existingSchedule = await getSchedule(req.params.id);
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    // Check if the schedule belongs to the authenticated user
    if (existingSchedule.userId! !== req.user.claims.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Delete the schedule
    const result = await deleteSchedule(req.params.id);
    if (result) {
      res.status(204).end();
    } else {
      res.status(500).json({ error: 'Failed to delete schedule' });
    }
  } catch (error) {
    console.error(`Error deleting schedule ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to delete schedule',
      message:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : String(error),
    });
  }
});
// Retry a failed schedule
router.post('/:id/retry', isAuthenticated, validateScheduleId, async (req: any, res) => {
  try {
    // Get the schedule to check ownership
    const existingSchedule = await getSchedule(req.params.id);
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    // Check if the schedule belongs to the authenticated user
    if (existingSchedule.userId! !== req.user.claims.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Only allow retrying failed schedules
    if (existingSchedule.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed schedules can be retried' });
    }
    // Retry the schedule
    const updatedSchedule = await retrySchedule(req.params.id);
    res.json(updatedSchedule);
  } catch (error) {
    console.error(`Error retrying schedule ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to retry schedule',
      message:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : String(error),
    });
  }
});
// Get execution logs for a schedule
router.get('/:id/logs', isAuthenticated, validateScheduleId, async (req: any, res) => {
  try {
    // Get the schedule to check ownership
    const existingSchedule = await getSchedule(req.params.id);
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    // Check if the schedule belongs to the authenticated user
    if (existingSchedule.userId! !== req.user.claims.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Get logs for the schedule
    const logs = await getScheduleLogs(req.params.id);
    res.json(logs);
  } catch (error) {
    console.error(`Error getting logs for schedule ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to get schedule logs',
      message:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : String(error),
    });
  }
});
export default router;
