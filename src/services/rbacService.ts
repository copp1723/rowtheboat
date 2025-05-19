/**
 * RBAC Service
 *
 * Provides role-based access control for API keys
 */
import { debug, info, warn, error } from '../shared/logger';
import { isError } from '../utils/errorUtils';
import { db } from '../shared/db';
import { apiKeys, SelectApiKey } from '../shared/schema'; // Added SelectApiKey
import { eq, and } from 'drizzle-orm';
import { logSecurityEvent } from './awsKmsService'; // Corrected import path

// Define role hierarchy
const roleHierarchy: Record<string, string[]> = {
  'admin': ['admin', 'manager', 'user', 'readonly'],
  'manager': ['manager', 'user', 'readonly'],
  'user': ['user', 'readonly'],
  'readonly': ['readonly'],
};

// Define permission sets for each role
const rolePermissions: Record<string, Record<string, string[]>> = {
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
  const currentRole = role as keyof typeof roleHierarchy;
  const roleLevel = roleHierarchy[currentRole] || roleHierarchy.readonly;

  if (!roleLevel) {
    warn(`Unknown role: ${role}, defaulting to readonly`);
    return hasPermission('readonly', resource, action);
  }

  const permissionsForRole = rolePermissions[currentRole];
  if (!permissionsForRole) {
    return false;
  }

  const permissionsForResource = permissionsForRole[resource];
  if (!permissionsForResource) {
    return false;
  }

  return permissionsForResource.includes(action);
}

/**
 * Get all permissions for a role
 *
 * @param role - Role to get permissions for
 * @returns Object containing all permissions for the role
 */
export function getRolePermissions(role: string): Record<string, string[]> {
  const currentRole = role as keyof typeof roleHierarchy;
  const validRole = roleHierarchy[currentRole] ? currentRole : 'readonly';

  if (validRole !== role) {
    warn(`Unknown role: ${role}, defaulting to readonly`);
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
    const [apiKey]: SelectApiKey[] = await db // Use SelectApiKey type
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, apiKeyId),
          eq(apiKeys.active, true)
        )
      );

    if (!apiKey) {
      warn(`API key not found or inactive: ${apiKeyId}`);
      return false;
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      warn(`API key expired: ${apiKeyId}`);
      await logSecurityEvent('api_key_expired', apiKey.userId || undefined, {
        apiKeyId,
        resource,
        action,
      }, 'warning');
      return false;
    }

    const role = apiKey.role || 'user';
    const permitted = hasPermission(role, resource, action);

    if (!permitted) {
      warn(`Permission denied for API key ${apiKeyId}: ${resource}:${action}`);
      await logSecurityEvent('api_key_permission_denied', apiKey.userId || undefined, {
        apiKeyId,
        resource,
        action,
        role,
      }, 'warning');
    }
    return permitted;
  } catch (err) {
    const errorMessage = isError(err) ? err.message : String(err);
    error(`Failed to check API key permission: ${errorMessage}`, {
      event: 'api_key_permission_check_error',
      error: errorMessage,
      apiKeyId,
      resource,
      action,
    });
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
    if (!(role in roleHierarchy)) {
      warn(`Invalid role: ${role}`);
      return false;
    }

    const basePermissions = getRolePermissions(role);
    const permissionsToSet = customPermissions
      ? { ...basePermissions, ...customPermissions }
      : basePermissions;

    await db
      .update(apiKeys)
      .set({
        role: role,
        // permissions: permissionsToSet, // Assuming permissions field exists and is of type JSON or similar
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, apiKeyId));

    info(
      `Updated permissions for API key ${apiKeyId}`,
      {
        event: 'api_key_permissions_updated',
        apiKeyId,
        role,
        hasCustomPermissions: !!customPermissions,
      }
    );
    await logSecurityEvent('api_key_permissions_updated', userId, {
      apiKeyId,
      role,
      hasCustomPermissions: !!customPermissions,
    });
    return true;
  } catch (err) {
    const errorMessage = isError(err) ? err.message : String(err);
    error(
      `Failed to update API key permissions: ${errorMessage}`,
      {
        event: 'api_key_permissions_update_error',
        error: errorMessage,
        apiKeyId,
        role,
      }
    );
    await logSecurityEvent('api_key_permissions_update_error', userId, {
      apiKeyId,
      role,
      error: errorMessage,
    }, 'error');
    return false;
  }
}

export default {
  hasPermission,
  getRolePermissions,
  checkApiKeyPermission,
  updateApiKeyPermissions,
};
