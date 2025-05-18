/**
 * RBAC Service
 * 
 * Provides role-based access control for API keys
 */
import { logger } from '../shared/logger.js';
import { isError } from '../utils/errorUtils.js';
import { db } from '../shared/db.js';
import { apiKeys } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { logSecurityEvent } from './awsKmsService.js';

// Define role hierarchy
const roleHierarchy = {
  'admin': ['admin', 'manager', 'user', 'readonly'],
  'manager': ['manager', 'user', 'readonly'],
  'user': ['user', 'readonly'],
  'readonly': ['readonly'],
};

// Define permission sets for each role
const rolePermissions = {
  'admin': {
    'api_keys': ['create', 'read', 'update', 'delete', 'list'],
    'users': ['create', 'read', 'update', 'delete', 'list'],
    'reports': ['create', 'read', 'update', 'delete', 'list'],
    'insights': ['create', 'read', 'update', 'delete', 'list'],
    'workflows': ['create', 'read', 'update', 'delete', 'list', 'execute'],
    'system': ['read', 'update'],
  },
  'manager': {
    'api_keys': ['read', 'list'],
    'users': ['read', 'list'],
    'reports': ['create', 'read', 'update', 'list'],
    'insights': ['create', 'read', 'update', 'list'],
    'workflows': ['create', 'read', 'update', 'list', 'execute'],
    'system': ['read'],
  },
  'user': {
    'api_keys': ['read'],
    'users': ['read'],
    'reports': ['create', 'read', 'list'],
    'insights': ['create', 'read', 'list'],
    'workflows': ['create', 'read', 'list', 'execute'],
    'system': [],
  },
  'readonly': {
    'api_keys': [],
    'users': [],
    'reports': ['read', 'list'],
    'insights': ['read', 'list'],
    'workflows': ['read', 'list'],
    'system': [],
  },
};

/**
 * Check if a role has a specific permission
 * 
 * @param role - Role to check
 * @param resource - Resource to check permission for
 * @param action - Action to check permission for
 * @returns true if the role has the permission
 */
export function hasPermission(
  role: string,
  resource: string,
  action: string
): boolean {
  // Get the role from the hierarchy or default to readonly
  const roleLevel = roleHierarchy[role] || roleHierarchy.readonly;
  
  // Check if the role exists in the hierarchy
  if (!roleLevel) {
    logger.warn(`Unknown role: ${role}, defaulting to readonly`);
    return hasPermission('readonly', resource, action);
  }
  
  // Check if the resource exists in the permissions
  if (!rolePermissions[role] || !rolePermissions[role][resource]) {
    return false;
  }
  
  // Check if the action is allowed for the resource
  return rolePermissions[role][resource].includes(action);
}

/**
 * Get all permissions for a role
 * 
 * @param role - Role to get permissions for
 * @returns Object containing all permissions for the role
 */
export function getRolePermissions(role: string): Record<string, string[]> {
  // Get the role from the hierarchy or default to readonly
  const validRole = roleHierarchy[role] ? role : 'readonly';
  
  if (validRole !== role) {
    logger.warn(`Unknown role: ${role}, defaulting to readonly`);
  }
  
  return rolePermissions[validRole] || rolePermissions.readonly;
}

/**
 * Check if an API key has permission to perform an action
 * 
 * @param apiKeyId - API key ID
 * @param resource - Resource to check permission for
 * @param action - Action to check permission for
 * @returns true if the API key has permission
 */
export async function checkApiKeyPermission(
  apiKeyId: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    // Get the API key
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, apiKeyId),
          eq(apiKeys.active, true)
        )
      );
    
    // If the API key doesn't exist or is inactive, deny access
    if (!apiKey) {
      logger.warn(`API key not found or inactive: ${apiKeyId}`);
      return false;
    }
    
    // Check if the API key has expired
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      logger.warn(`API key expired: ${apiKeyId}`);
      
      // Log security event
      await logSecurityEvent('api_key_expired', apiKey.userId || undefined, {
        apiKeyId,
        resource,
        action,
      }, 'warning');
      
      return false;
    }
    
    // Get the role from the API key
    const role = apiKey.role || 'user';
    
    // Check if the role has the permission
    const permitted = hasPermission(role, resource, action);
    
    // Log the permission check
    if (!permitted) {
      logger.warn(`Permission denied for API key ${apiKeyId}: ${resource}:${action}`);
      
      // Log security event
      await logSecurityEvent('api_key_permission_denied', apiKey.userId || undefined, {
        apiKeyId,
        resource,
        action,
        role,
      }, 'warning');
    }
    
    return permitted;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'api_key_permission_check_error',
      error: errorMessage,
      apiKeyId,
      resource,
      action,
    }, `Failed to check API key permission: ${errorMessage}`);
    
    // Log security event
    await logSecurityEvent('api_key_permission_check_error', undefined, {
      apiKeyId,
      resource,
      action,
      error: errorMessage,
    }, 'error');
    
    return false;
  }
}

/**
 * Update API key permissions
 * 
 * @param apiKeyId - API key ID
 * @param role - New role for the API key
 * @param customPermissions - Custom permissions to override role defaults
 * @param userId - User ID performing the update
 * @returns true if the update was successful
 */
export async function updateApiKeyPermissions(
  apiKeyId: string,
  role: string,
  customPermissions?: Record<string, string[]>,
  userId?: string
): Promise<boolean> {
  try {
    // Validate the role
    if (!roleHierarchy[role]) {
      logger.warn(`Invalid role: ${role}`);
      return false;
    }
    
    // Get the base permissions for the role
    const basePermissions = getRolePermissions(role);
    
    // Merge with custom permissions if provided
    const permissions = customPermissions
      ? { ...basePermissions, ...customPermissions }
      : basePermissions;
    
    // Update the API key
    await db
      .update(apiKeys)
      .set({
        role,
        permissions,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, apiKeyId));
    
    // Log the update
    logger.info({
      event: 'api_key_permissions_updated',
      apiKeyId,
      role,
      hasCustomPermissions: !!customPermissions,
    }, `Updated permissions for API key ${apiKeyId}`);
    
    // Log security event
    await logSecurityEvent('api_key_permissions_updated', userId, {
      apiKeyId,
      role,
      hasCustomPermissions: !!customPermissions,
    });
    
    return true;
  } catch (error) {
    const errorMessage = isError(error) ? error.message : String(error);
    logger.error({
      event: 'api_key_permissions_update_error',
      error: errorMessage,
      apiKeyId,
      role,
    }, `Failed to update API key permissions: ${errorMessage}`);
    
    // Log security event
    await logSecurityEvent('api_key_permissions_update_error', userId, {
      apiKeyId,
      role,
      error: errorMessage,
    }, 'error');
    
    return false;
  }
}

// Export the service
export default {
  hasPermission,
  getRolePermissions,
  checkApiKeyPermission,
  updateApiKeyPermissions,
};
