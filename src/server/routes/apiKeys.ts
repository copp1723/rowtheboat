/**
 * API Key management routes
 * Handles CRUD operations for user API keys with authentication
 * Enhanced with aggressive rate limiting and suspicious pattern detection
 */
import express from 'express';
import { isAuthenticated } from '../replitAuth.js';
import {
  rateLimiters,
  detectSuspiciousPatterns
} from '../../shared/middleware/rateLimiter.js';
import { logger } from '../../shared/logger.js';
import {
  addApiKey,
  getApiKeys,
  getApiKeyById,
  updateApiKey,
  deleteApiKey,
} from '../../services/apiKeyService.js';

const router = express.Router();

// Apply security middleware to all API key routes
router.use(detectSuspiciousPatterns()); // Detect suspicious patterns
router.use(rateLimiters.apiKeys); // Apply aggressive rate limiting
router.use(isAuthenticated); // Require authentication

// Log all API key operations for security auditing
router.use((req, res, next) => {
  logger.info(`API Key operation: ${req.method} ${req.path}`, {
    ip: req.ip,
    userId: req.user?.claims?.sub,
    method: req.method,
    path: req.path,
  });
  next();
});

/**
 * Get all API keys for the authenticated user
 * Optional service filter
 */
router.get('/', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const service = req.query.service as string | undefined;
    const results = await getApiKeys(userId, service);

    res.json(results);
  } catch (error) {
    console.error('Error getting API keys:', error);
    res.status(500).json({ error: 'Failed to retrieve API keys' });
  }
});

/**
 * Get a specific API key by ID
 */
router.get('/:id', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const apiKeyId = req.params.id;

    const apiKey = await getApiKeyById(apiKeyId, userId);
    res.json(apiKey);
  } catch (error) {
    console.error('Error getting API key:', error);

    if (error instanceof Error && error.message === 'API key not found or access denied') {
      return res.status(404).json({ error: 'API key not found or access denied' });
    }

    res.status(500).json({ error: 'Failed to retrieve API key' });
  }
});

/**
 * Add a new API key
 * Extra-aggressive rate limiting applied to prevent abuse
 */
router.post('/', rateLimiters.apiKeyCreation, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { service, keyName, keyValue, label, additionalData, expiresAt } = req.body;

    // Validate required fields
    if (!service || !keyName || !keyValue) {
      return res.status(400).json({
        error: 'Service, key name, and key value are required'
      });
    }

    // Create API key
    const apiKey = await addApiKey(
      userId,
      service,
      keyName,
      keyValue,
      {
        label,
        additionalData,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      }
    );

    // Return the created API key with masked key value
    res.status(201).json({
      id: apiKey.id,
      service: apiKey.service,
      keyName: apiKey.keyName,
      label: apiKey.label,
      created: apiKey.createdAt,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * Update an API key
 */
router.put('/:id', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const apiKeyId = req.params.id;
    const { keyValue, label, additionalData, active, expiresAt } = req.body;

    // Update API key
    const apiKey = await updateApiKey(
      apiKeyId,
      userId,
      {
        keyValue,
        label,
        additionalData,
        active,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      }
    );

    res.json({
      id: apiKey.id,
      service: apiKey.service,
      keyName: apiKey.keyName,
      label: apiKey.label,
      active: apiKey.active,
      updated: apiKey.updatedAt,
    });
  } catch (error) {
    console.error('Error updating API key:', error);

    if (error instanceof Error && error.message === 'API key not found or access denied') {
      return res.status(404).json({ error: 'API key not found or access denied' });
    }

    res.status(500).json({ error: 'Failed to update API key' });
  }
});

/**
 * Delete an API key
 */
router.delete('/:id', async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const apiKeyId = req.params.id;

    const success = await deleteApiKey(apiKeyId, userId);

    if (success) {
      res.status(204).end();
    } else {
      res.status(404).json({ error: 'API key not found or access denied' });
    }
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

export default router;
