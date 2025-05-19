/**
 * Enhanced API Key Service
 * 
 * Securely stores and manages API keys for integrations
 * Uses AWS KMS for encryption and implements RBAC
 */
import { eq, and } from 'drizzle-orm';
import { db } from '../shared/db.js';
import { apiKeys } from '../shared/schema.js';
import { debug, info, warn, error } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';
import { encryptData, decryptData, isEncryptionConfigured } from './kmsEncryptionService';
import { logSecurityEvent } from './awsKmsService';
import { updateApiKeyPermissions } from './rbacService';

/**
 * API Key data interface
 */
export interface ApiKeyData {
  keyValue: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  [key: string]: string | undefined;
}

/**
 * Add a new API key with enhanced security
 * 
 * @param userId - User ID who owns this API key
 * @param service - Service name (e.g., 'google_ads', 'facebook_ads')
 * @param keyName - Name of the key
 * @param keyValue - The API key value
 * @param options - Additional options
 * @returns Created API key
 */
export async function addApiKey(
  userId: string,
  service: string,
  keyName: string,
  keyValue: string,
  options?: {
    label?: string;
    additionalData?: Record<string, string>;
    expiresAt?: Date;
    role?: string;
    permissions?: Record<string, string[]>;
  }
): Promise<any> {
  // Verify encryption is configured properly
  if (!isEncryptionConfigured()) {
    warn('Warning: Using default encryption key. Set ENCRYPTION_KEY in production.');
  }

  try {
    // Encrypt additional data if provided
    let encryptedData: string | undefined;
    let iv: string | undefined;
    let authTag: string | undefined;
    let keyVersion: string | undefined;

    if (options?.additionalData && Object.keys(options.additionalData).length > 0) {
      const encryptionResult = await encryptData(options.additionalData, userId);
      encryptedData = encryptionResult.encryptedData;
      iv = encryptionResult.iv;
      authTag = encryptionResult.authTag;
      keyVersion = encryptionResult.keyVersion;
    }

    // Create API key record
    const apiKey = {
      userId,
      keyName,
      keyValue,
      service,
      label: options?.label || `${service} API Key`,
      encryptedData,
      iv,
      authTag,
      keyVersion,
      role: options?.role || 'user',
      permissions: options?.permissions || {},
      metadata: {},
      expiresAt: options?.expiresAt,
      active: true,
    };

    // Insert into database
    const [createdApiKey] = await db.insert(apiKeys).values(apiKey).returning();

    // Log security event
    await logSecurityEvent('api_key_created', userId, {
      apiKeyId: createdApiKey.id,
      service,
      keyName,
      role: options?.role || 'user',
    });

    return createdApiKey;
  } catch (error) {
    const errorMessage = isError(error) 
      ? error instanceof Error 
        ? error.message 
        : String(error) 
      : String(error);
    
    error({
      event: 'api_key_creation_error',
      error: errorMessage,
      userId,
      service,
      keyName,
    }, `Error adding API key: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('api_key_creation_failed', userId, {
      service,
      keyName,
      error: errorMessage,
    }, 'error');

    throw error;
  }
}

/**
 * Get API keys for a user with enhanced security
 * 
 * @param userId - User ID
 * @param service - Optional service filter
 * @returns Array of API keys
 */
export async function getApiKeys(userId: string, service?: string): Promise<any[]> {
  try {
    let query = db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId!, userId));

    if (service) {
      query = query.where(eq(apiKeys.service, service));
    }

    const results = await query;
    
    // Log security event
    await logSecurityEvent('api_keys_retrieved', userId, {
      count: results.length,
      service,
    });

    // Remove sensitive data from results
    return results.map(key => ({
      id: key.id,
      service: key.service,
      keyName: key.keyName,
      label: key.label,
      role: key.role,
      keyVersion: key.keyVersion,
      active: key.active,
      expiresAt: key.expiresAt,
      rotatedAt: key.rotatedAt,
      rotationStatus: key.rotationStatus,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
      // Mask the key value for security
      keyValue: maskApiKey(key.keyValue),
    }));
  } catch (error) {
    const errorMessage = isError(error) 
      ? error instanceof Error 
        ? error.message 
        : String(error) 
      : String(error);
    
    error({
      event: 'api_keys_retrieval_error',
      error: errorMessage,
      userId,
      service,
    }, `Error getting API keys: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('api_keys_retrieval_failed', userId, {
      service,
      error: errorMessage,
    }, 'error');

    throw error;
  }
}

/**
 * Get a specific API key by ID with enhanced security
 * 
 * @param id - API key ID
 * @param userId - User ID for authorization
 * @returns API key if found and authorized
 */
export async function getApiKeyById(id: string, userId: string): Promise<any> {
  try {
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId!, userId)));

    if (!apiKey) {
      // Log security event
      await logSecurityEvent('api_key_access_denied', userId, {
        apiKeyId: id,
      }, 'warning');

      throw new Error('API key not found or access denied');
    }

    // Decrypt additional data if available
    let additionalData: Record<string, string> | undefined;
    if (apiKey.encryptedData && apiKey.iv && apiKey.authTag) {
      additionalData = await decryptData(
        apiKey.encryptedData,
        apiKey.iv,
        apiKey.authTag,
        apiKey.keyVersion,
        userId
      ) as Record<string, string>;
    }

    // Log security event
    await logSecurityEvent('api_key_retrieved', userId, {
      apiKeyId: id,
      service: apiKey.service,
    });

    return {
      ...apiKey,
      keyValue: maskApiKey(apiKey.keyValue),
      additionalData,
    };
  } catch (error) {
    const errorMessage = isError(error) 
      ? error instanceof Error 
        ? error.message 
        : String(error) 
      : String(error);
    
    error({
      event: 'api_key_retrieval_error',
      error: errorMessage,
      userId,
      apiKeyId: id,
    }, `Error getting API key by ID: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('api_key_retrieval_failed', userId, {
      apiKeyId: id,
      error: errorMessage,
    }, 'error');

    throw error;
  }
}

/**
 * Update an API key with enhanced security
 * 
 * @param id - API key ID
 * @param userId - User ID for authorization
 * @param updates - Fields to update
 * @returns Updated API key
 */
export async function updateApiKey(
  id: string,
  userId: string,
  updates: {
    keyValue?: string;
    label?: string;
    additionalData?: Record<string, string>;
    active?: boolean;
    expiresAt?: Date;
    role?: string;
    permissions?: Record<string, string[]>;
  }
): Promise<any> {
  try {
    // First verify the API key exists and belongs to this user
    const [existingApiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId!, userId)));

    if (!existingApiKey) {
      // Log security event
      await logSecurityEvent('api_key_update_denied', userId, {
        apiKeyId: id,
      }, 'warning');

      throw new Error('API key not found or access denied');
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.label !== undefined) {
      updateData.label = updates.label;
    }

    if (updates.keyValue !== undefined) {
      updateData.keyValue = updates.keyValue;
    }

    if (updates.active !== undefined) {
      updateData.active = updates.active;
    }

    if (updates.expiresAt !== undefined) {
      updateData.expiresAt = updates.expiresAt;
    }

    // If role or permissions are updated, update them
    if (updates.role !== undefined) {
      updateData.role = updates.role;
    }

    // If additional data is provided, encrypt it
    if (updates.additionalData && Object.keys(updates.additionalData).length > 0) {
      const encryptionResult = await encryptData(updates.additionalData, userId);
      updateData.encryptedData = encryptionResult.encryptedData;
      updateData.iv = encryptionResult.iv;
      updateData.authTag = encryptionResult.authTag;
      updateData.keyVersion = encryptionResult.keyVersion;
    }

    // Update in database
    const [updatedApiKey] = await db
      .update(apiKeys)
      .set(updateData)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId!, userId)))
      .returning();

    // If role or permissions are updated, update them using RBAC service
    if (updates.role !== undefined || updates.permissions !== undefined) {
      await updateApiKeyPermissions(
        id,
        updates.role || existingApiKey.role || 'user',
        updates.permissions,
        userId
      );
    }

    // Log security event
    await logSecurityEvent('api_key_updated', userId, {
      apiKeyId: id,
      service: updatedApiKey.service,
    });

    return {
      ...updatedApiKey,
      keyValue: maskApiKey(updatedApiKey.keyValue),
    };
  } catch (error) {
    const errorMessage = isError(error) 
      ? error instanceof Error 
        ? error.message 
        : String(error) 
      : String(error);
    
    error({
      event: 'api_key_update_error',
      error: errorMessage,
      userId,
      apiKeyId: id,
    }, `Error updating API key: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('api_key_update_failed', userId, {
      apiKeyId: id,
      error: errorMessage,
    }, 'error');

    throw error;
  }
}

/**
 * Delete an API key with enhanced security
 * 
 * @param id - API key ID
 * @param userId - User ID for authorization
 * @returns Success status
 */
export async function deleteApiKey(id: string, userId: string): Promise<boolean> {
  try {
    // Get the API key first for logging
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId!, userId)));

    if (!apiKey) {
      // Log security event
      await logSecurityEvent('api_key_deletion_denied', userId, {
        apiKeyId: id,
      }, 'warning');

      return false;
    }

    const result = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId!, userId)))
      .returning({ id: apiKeys.id });

    // Log security event
    if (result.length > 0) {
      await logSecurityEvent('api_key_deleted', userId, {
        apiKeyId: id,
        service: apiKey.service,
        keyName: apiKey.keyName,
      });
    }

    return result.length > 0;
  } catch (error) {
    const errorMessage = isError(error) 
      ? error instanceof Error 
        ? error.message 
        : String(error) 
      : String(error);
    
    error({
      event: 'api_key_deletion_error',
      error: errorMessage,
      userId,
      apiKeyId: id,
    }, `Error deleting API key: ${errorMessage}`);

    // Log security event
    await logSecurityEvent('api_key_deletion_failed', userId, {
      apiKeyId: id,
      error: errorMessage,
    }, 'error');

    throw error;
  }
}

/**
 * Mask an API key for display
 * @param keyValue - The API key to mask
 * @returns Masked API key
 */
function maskApiKey(keyValue: string): string {
  if (!keyValue) return '';
  
  // If key is very short, just return "****"
  if (keyValue.length < 8) return '****';
  
  // Otherwise show first 4 and last 4 characters
  return `${keyValue.substring(0, 4)}...${keyValue.substring(keyValue.length - 4)}`;
}

// Export the service
export default {
  addApiKey,
  getApiKeys,
  getApiKeyById,
  updateApiKey,
  deleteApiKey,
};
