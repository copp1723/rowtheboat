/**
 * API Routes for Job Management
 */
import { Router } from 'express';
import { isError } from '../utils/errorUtils.js';
import { listJobs, getJobById, retryJob, enqueueJob } from '../../services/jobQueue.js';
import { isAuthenticated } from '../replitAuth.js';
import { db } from '../../shared/db.js';
import { taskLogs } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
const router = Router();
// Get all jobs with optional filtering by status
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { status, limit } = req.query;
    const jobs = await listJobs(
      status as string | undefined,
      limit ? parseInt(limit as string) : 100
    );
    res.json({ jobs });
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
    console.error('Error listing jobs:', error);
    res.status(500).json({
      error: 'Failed to list jobs',
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
          : 'Unknown error',
    });
  }
});
// Get a specific job by ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const job = await getJobById(id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    // Get associated task information
    const taskData = await db
      .select()
      .from(taskLogs)
      .where(eq(taskLogs.id, job.taskId || ''));
    const task = taskData.length > 0 ? taskData[0] : null;
    res.json({
      job,
      task,
    });
  } catch (error) {
    console.error(`Error getting job ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to get job details',
      message:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : 'Unknown error',
    });
  }
});
// Manually retry a failed job
router.post('/:id/retry', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await retryJob(id);
    if (!success) {
      res.status(400).json({ error: 'Failed to retry job' });
      return;
    }
    res.json({
      message: 'Job retry initiated',
      jobId: id,
    });
  } catch (error) {
    console.error(`Error retrying job ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to retry job',
      message:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : 'Unknown error',
    });
  }
});
// Manually enqueue a new job for a task
router.post('/enqueue/:taskId', isAuthenticated, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { priority } = req.body;
    // Verify task exists
    const taskData = await db.select().from(taskLogs).where(eq(taskLogs.id, taskId.toString()));
    if (taskData.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    const jobId = await enqueueJob(taskId, priority || 1);
    res.json({
      message: 'Job enqueued successfully',
      jobId,
    });
  } catch (error) {
    console.error(`Error enqueuing job for task ${req.params.taskId}:`, error);
    res.status(500).json({
      error: 'Failed to enqueue job',
      message:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : 'Unknown error',
    });
  }
});
export default router;
