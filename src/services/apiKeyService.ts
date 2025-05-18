/**
 * API Key Service
 * Securely stores and manages API keys for integrations
 */
import { eq, and } from 'drizzle-orm';
import { db } from '../shared/db.js';
import { apiKeys } from '../shared/schema.js';
import { encryptData, decryptData, isEncryptionConfigured } from '../utils/encryption.js';
import { logger } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';

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
 * Add a new API key
 * @param userId - User ID who owns this API key
 * @param service - Service name (e.g., 'google_ads', 'facebook_ads')
 * @param keyName - Name of the key
 * @param keyValue - The API key value
 * @param options - Additional options like label and additional data
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
  }
): Promise<any> {
  // Verify encryption is configured properly
  if (!isEncryptionConfigured()) {
    logger.warn('Warning: Using default encryption key. Set ENCRYPTION_KEY in production.');
  }

  try {
    // Encrypt additional data if provided
    let encryptedData: string | undefined;
    let iv: string | undefined;

    if (options?.additionalData && Object.keys(options.additionalData).length > 0) {
      const encryptionResult = encryptData(options.additionalData);
      encryptedData = encryptionResult.encryptedData;
      iv = encryptionResult.iv;
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
      metadata: {},
      expiresAt: options?.expiresAt,
      active: true,
    };

    // Insert into database
    const [createdApiKey] = await db.insert(apiKeys).values(apiKey).returning();
    return createdApiKey;
  } catch (error) {
    const errorMessage = isError(error) 
      ? error instanceof Error 
        ? error.message 
        : String(error) 
      : String(error);
    
    logger.error(`Error adding API key: ${errorMessage}`);
    throw error;
  }
}

/**
 * Get API keys for a user
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
    
    // Remove sensitive data from results
    return results.map(key => ({
      id: key.id,
      service: key.service,
      keyName: key.keyName,
      label: key.label,
      active: key.active,
      expiresAt: key.expiresAt,
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
    
    logger.error(`Error getting API keys: ${errorMessage}`);
    throw error;
  }
}

/**
 * Get a specific API key by ID
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
      throw new Error('API key not found or access denied');
    }

    // Decrypt additional data if available
    let additionalData: Record<string, string> | undefined;
    if (apiKey.encryptedData && apiKey.iv) {
      additionalData = decryptData(apiKey.encryptedData, apiKey.iv) as Record<string, string>;
    }

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
    
    logger.error(`Error getting API key by ID: ${errorMessage}`);
    throw error;
  }
}

/**
 * Update an API key
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
  }
): Promise<any> {
  try {
    // First verify the API key exists and belongs to this user
    const [existingApiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId!, userId)));

    if (!existingApiKey) {
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

    // If additional data is provided, encrypt it
    if (updates.additionalData && Object.keys(updates.additionalData).length > 0) {
      const { encryptedData, iv } = encryptData(updates.additionalData);
      updateData.encryptedData = encryptedData;
      updateData.iv = iv;
    }

    // Update in database
    const [updatedApiKey] = await db
      .update(apiKeys)
      .set(updateData)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId!, userId)))
      .returning();

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
    
    logger.error(`Error updating API key: ${errorMessage}`);
    throw error;
  }
}

/**
 * Delete an API key
 * @param id - API key ID
 * @param userId - User ID for authorization
 * @returns Success status
 */
export async function deleteApiKey(id: string, userId: string): Promise<boolean> {
  try {
    const result = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId!, userId)))
      .returning({ id: apiKeys.id });

    return result.length > 0;
  } catch (error) {
    const errorMessage = isError(error) 
      ? error instanceof Error 
        ? error.message 
        : String(error) 
      : String(error);
    
    logger.error(`Error deleting API key: ${errorMessage}`);
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
