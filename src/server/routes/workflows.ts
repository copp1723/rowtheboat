/**
 * Workflow Routes
 * Handles API routes for workflow operations
 */
import express, { Request, Response } from 'express';
import {
  getWorkflow,
  getWorkflows,
  resetWorkflow,
  configureWorkflowNotifications,
} from '../../services/workflowService.js';
import { isAuthenticated } from '../replitAuth.js';
const router = express.Router();
/**
 * Get all workflows (or filter by status)
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    // Access user ID from the user object (if available)
    const userId = req.user ? (req.user as any).claims?.sub : null;
    const workflows = await getWorkflows(status, userId);
    res.json(workflows);
    return;
  } catch (error) {
    console.error('Error getting workflows:', error);
    res.status(500).json({ error: 'Failed to get workflows' });
    return;
  }
});
/**
 * Get a workflow by ID
 */
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const workflowId = req.params.id;
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }
    const userId = req.user ? (req.user as any).claims?.sub : null;
    // If userId is provided and doesn't match, deny access
    if (userId && workflow.userId! && workflow.userId! !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    res.json(workflow);
    return;
  } catch (error) {
    console.error('Error getting workflow:', error);
    res.status(500).json({ error: 'Failed to get workflow' });
    return;
  }
});
/**
 * Reset a workflow to pending status
 */
router.post('/:id/reset', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const workflowId = req.params.id;
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }
    const userId = req.user ? (req.user as any).claims?.sub : null;
    // If userId is provided and doesn't match, deny access
    if (userId && workflow.userId! && workflow.userId! !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    const resetResult = await resetWorkflow(workflowId);
    res.json(resetResult);
    return;
  } catch (error) {
    console.error('Error resetting workflow:', error);
    res.status(500).json({ error: 'Failed to reset workflow' });
    return;
  }
});
/**
 * Configure email notifications for a workflow
 */
router.post('/:id/notifications', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { emails } = req.body;
    if (!emails) {
      res.status(400).json({ error: 'Email addresses are required' });
      return;
    }
    const workflowId = req.params.id;
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }
    const userId = req.user ? (req.user as any).claims?.sub : null;
    // If userId is provided and doesn't match, deny access
    if (userId && workflow.userId! && workflow.userId! !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    // Configure notifications for the workflow
    const updatedWorkflow = await configureWorkflowNotifications(workflowId, emails);
    res.json(updatedWorkflow);
    return;
  } catch (error) {
    console.error('Error configuring workflow notifications:', error);
    res.status(500).json({ error: 'Failed to configure workflow notifications' });
    return;
  }
});
export default router;
