/**
 * Email Notification API Routes
 * Handles email notification configuration and management
 */
import { Router } from 'express';
import { Request, Response } from 'express';
import {
  sendWorkflowEmail,
  getEmailLogs,
  retryEmail,
  configureNotification,
  getNotificationSettings,
  deleteNotification,
} from '../../services/workflowEmailService.js';
const router = Router();
/**
 * Configure email notifications for a workflow
 * POST /api/emails/notifications/:workflowId
 */
router.post('/notifications/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { recipientEmail, sendOnCompletion, sendOnFailure } = req.body;
    const result = await configureNotification(workflowId, {
      recipientEmail,
      sendOnCompletion,
      sendOnFailure,
    });
    return res.json(result);
  } catch (error) {
    console.error('Error configuring notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to configure notification',
    });
  }
});
/**
 * Get email notification settings for a workflow
 * GET /api/emails/notifications/:workflowId
 */
router.get('/notifications/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const settings = await getNotificationSettings(workflowId);
    return res.json(settings);
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get notification settings',
    });
  }
});
/**
 * Delete notification settings for a workflow
 * DELETE /api/emails/notifications/:workflowId
 */
router.delete('/notifications/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const result = await deleteNotification(workflowId);
    return res.json(result);
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
    });
  }
});
/**
 * Get email logs for a workflow
 * GET /api/emails/logs/:workflowId
 */
router.get('/logs/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const logs = await getEmailLogs(workflowId);
    return res.json(logs);
  } catch (error) {
    console.error('Error getting email logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get email logs',
    });
  }
});
/**
 * Retry sending a failed email
 * POST /api/emails/retry/:emailLogId
 */
router.post('/retry/:emailLogId', async (req: Request, res: Response) => {
  try {
    const { emailLogId } = req.params;
    const result = await retryEmail(emailLogId);
    return res.json(result);
  } catch (error) {
    console.error('Error retrying email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retry email',
    });
  }
});
export default router;
