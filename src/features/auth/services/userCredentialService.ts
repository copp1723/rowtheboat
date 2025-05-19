/**
 * User Credential Service
 *
 * Provides secure storage and management of user-specific credentials
 * with enhanced encryption and security audit logging.
 */
import { eq, and, desc } from 'drizzle-orm';
import { isError } from '../../../../utils/errorUtils';
import { db } from '../../../../shared/db';
import { userCredentials } from '../../../../shared/schema';
import { encryptData, decryptData, isEncryptionConfigured, logSecurityEvent } from '../../../../utils/encryption';
import { debug, info, warn, error } from '../../../../shared/logger';

// Use the schema-generated types for database operations

// Define a type alias that combines the schema type with any additional properties needed
type UserCredential = {
  userId: string;
  serviceName: string;
  credentialName: string;
  encryptedPayload: string;
  iv: string;
  authTag: string;
  metadata?: Record<string, any>;
  expiresAt?: Date | null | undefined;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastUsed?: Date | null;
};

type UpsertUserCredential = Omit<UserCredential, 'id'>;

type CredentialPayload = Record<string, any>;

// Add error type guard
function isCredentialError(error: unknown): error is { message: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error instanceof Error
      ? error instanceof Error
        ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
        : String(error)
      : String(error)) === 'string'
  );
}

function getErrorMessage(error: unknown): string {
  return isError(error) ? (error instanceof Error ? error.message : String(error)) : String(error);
}

/**
 * Add a new credential for a user
 *
 * @param userId - User ID who owns this credential
 * @param serviceName - Service name (e.g., 'vinsolutions', 'openai')
 * @param credentialName - User-friendly name for this credential
 * @param payload - Credential data to encrypt and store
 * @param metadata - Optional non-sensitive metadata about the credential
 * @param expiresAt - Optional expiration date
 * @returns Created credential (without sensitive data)
 */
export async function addUserCredential(
  userId: string,
  serviceName: string,
  credentialName: string,
  payload: CredentialPayload,
  metadata: Record<string, any> = {},
  expiresAt?: Date
): Promise<UserCredential> {
  // Verify encryption is configured properly
  if (!isEncryptionConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      const err = new Error('Cannot add credentials: Encryption not properly configured');
      error('Security violation: Attempted to add credentials without proper encryption', err);
      // Log security event
      await logSecurityEvent(
        'encryption_not_configured',
        userId,
        { serviceName, action: 'add_credential' },
        'critical'
      );
      throw err;
    }
    warn('Using default encryption key in development. Set ENCRYPTION_KEY for production.');
  }
  try {
    // Encrypt the credential data
    const { encryptedData, iv, authTag } = encryptData(payload, userId);
    // Create credential record
    const credential: UpsertUserCredential = {
      userId,
      serviceName,
      credentialName,
      encryptedPayload: encryptedData,
      iv,
      authTag,
      metadata,
      expiresAt,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // Insert into database
    const [createdCredential] = await db.insert(userCredentials).values(credential).returning();
    // Log security event
    await logSecurityEvent(
      'credential_created',
      userId,
      {
        credentialId: createdCredential.id,
        serviceName,
        credentialName,
      },
      'info'
    );
    return createdCredential;
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    if (
      isCredentialError(err) && errorMessage !== 'Credential not found or access denied'
    ) {
      error('Error saving credential:', err);
    }
    throw err;
  }
}

/**
 * Get credential by ID with decrypted payload
 *
 * @param id - Credential UUID
 * @param userId - User ID for security verification
 * @returns Credential with decrypted payload
 */
export async function getUserCredentialById(
  id: string,
  userId: string
): Promise<{ credential: UserCredential; payload: CredentialPayload }> {
  try {
    // Query with user ID for security
    const [credential] = await db
      .select()
      .from(userCredentials)
      .where(
        and(
          eq(userCredentials.id, id.toString()),
          eq(userCredentials.userId!, userId),
          eq(userCredentials.active, true)
        )
      );
    if (!credential) {
      // Log security event for attempted access
      await logSecurityEvent(
        'credential_access_denied',
        userId,
        { credentialId: id, reason: 'not_found_or_inactive' },
        'warning'
      );
      throw new Error('Credential not found or access denied');
    }
    // Update last used timestamp
    await db
      .update(userCredentials)
      .set({
        lastUsed: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userCredentials.id, id.toString()));
    // Decrypt the payload
    const payload = decryptData(
      credential.encryptedPayload,
      credential.iv,
      credential.authTag,
      userId
    ) as CredentialPayload;
    // Log access
    await logSecurityEvent(
      'credential_accessed',
      userId,
      {
        credentialId: id,
        serviceName: credential.serviceName,
      },
      'info'
    );
    return {
      credential,
      payload,
    };
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    if (
      isCredentialError(err) && errorMessage !== 'Credential not found or access denied'
    ) {
      error('Error loading credential:', err);
    }
    throw err;
  }
}

/**
 * Get credentials for a user and service
 *
 * @param userId - User ID
 * @param serviceName - Service name (optional)
 * @returns Array of credentials (without decrypted payloads)
 */
export async function getUserCredentials(
  userId: string,
  serviceName?: string
): Promise<UserCredential[]> {
  try {
    // Build query conditions
    const conditions = [eq(userCredentials.userId!, userId), eq(userCredentials.active, true)];
    if (serviceName) {
      conditions.push(eq(userCredentials.serviceName, serviceName));
    }
    // Query active credentials
    const results = await db
      .select()
      .from(userCredentials)
      .where(and(...conditions));
    // Log access
    await logSecurityEvent(
      'credentials_listed',
      userId,
      {
        serviceName: serviceName || 'all',
        count: results.length,
      },
      'info'
    );
    return results;
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    error('Failed to list user credentials:', err);
    // Log security event
    await logSecurityEvent(
      'credentials_list_error',
      userId,
      {
        serviceName: serviceName || 'all',
        error: errorMessage,
      },
      'error'
    );
    throw new Error('Failed to retrieve credentials');
  }
}

/**
 * Update an existing credential
 *
 * @param id - Credential ID to update
 * @param userId - User ID for security verification
 * @param payload - New credential payload (optional)
 * @param metadata - New metadata (optional)
 * @param expiresAt - New expiration date (optional)
 * @returns Updated credential
 */
export async function updateUserCredential(
  id: string,
  userId: string,
  payload?: CredentialPayload,
  metadata?: Record<string, any>,
  expiresAt?: Date
): Promise<UserCredential> {
  try {
    // Verify the credential exists and belongs to the user
    const [existingCredential] = await db
      .select()
      .from(userCredentials)
      .where(
        and(
          eq(userCredentials.id, id.toString()),
          eq(userCredentials.userId!, userId),
          eq(userCredentials.active, true)
        )
      );
    if (!existingCredential) {
      // Log security event for attempted update
      await logSecurityEvent(
        'credential_update_denied',
        userId,
        { credentialId: id, reason: 'not_found_or_inactive' },
        'warning'
      );
      throw new Error('Credential not found or access denied');
    }
    // Build update object
    const updates: Partial<UpsertUserCredential> = {
      updatedAt: new Date(),
    };
    // If payload is provided, encrypt it
    if (payload) {
      const { encryptedData, iv, authTag } = encryptData(payload, userId);
      updates.encryptedPayload = encryptedData;
      updates.iv = iv;
      updates.authTag = authTag;
    }
    // Update metadata if provided
    if (metadata) {
      updates.metadata = metadata;
    }
    // Update expiration if provided
    if (expiresAt) {
      updates.expiresAt = expiresAt;
    }
    // Update in database
    const [updatedCredential] = await db
      .update(userCredentials)
      .set(updates)
      .where(and(eq(userCredentials.id, id.toString()), eq(userCredentials.userId!, userId)))
      .returning();
    // Log security event
    await logSecurityEvent(
      'credential_updated',
      userId,
      {
        credentialId: id,
        serviceName: existingCredential.serviceName,
        credentialName: existingCredential.credentialName,
      },
      'info'
    );
    return updatedCredential;
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    if (
      isCredentialError(err) && errorMessage !== 'Credential not found or access denied'
    ) {
      error('Error saving credential:', err);
    }
    throw err;
  }
}

/**
 * Delete credential (soft delete by setting active=false)
 *
 * @param id - Credential ID to delete
 * @param userId - User ID for security verification
 * @returns Success flag
 */
export async function deleteUserCredential(id: string, userId: string): Promise<boolean> {
  try {
    // Verify the credential exists and belongs to the user
    const [existingCredential] = await db
      .select()
      .from(userCredentials)
      .where(
        and(
          eq(userCredentials.id, id.toString()),
          eq(userCredentials.userId!, userId),
          eq(userCredentials.active, true)
        )
      );
    if (!existingCredential) {
      // Log security event for attempted deletion
      await logSecurityEvent(
        'credential_deletion_denied',
        userId,
        { credentialId: id, reason: 'not_found_or_inactive' },
        'warning'
      );
      throw new Error('Credential not found or access denied');
    }
    // Mark as inactive rather than deleting
    const [updated] = await db
      .update(userCredentials)
      .set({
        active: false,
        updatedAt: new Date(),
      })
      .where(and(eq(userCredentials.id, id.toString()), eq(userCredentials.userId!, userId)))
      .returning();
    // Log security event
    await logSecurityEvent(
      'credential_deleted',
      userId,
      {
        credentialId: id,
        serviceName: existingCredential.serviceName,
        credentialName: existingCredential.credentialName,
      },
      'info'
    );
    return !!updated;
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    if (
      isCredentialError(err) && errorMessage !== 'Credential not found or access denied'
    ) {
      error('Error deleting credential:', err);
    }
    throw err;
  }
}

/**
 * Hard delete a credential (for admin use or compliance)
 *
 * @param id - Credential ID
 * @param userId - User ID for security verification
 * @param adminId - Admin user ID performing the operation
 * @param reason - Reason for hard deletion (for audit)
 * @returns Success flag
 */
export async function hardDeleteUserCredential(
  id: string,
  userId: string,
  adminId: string,
  reason: string
): Promise<boolean> {
  try {
    // Verify the credential exists and belongs to the user
    const [existingCredential] = await db
      .select()
      .from(userCredentials)
      .where(and(eq(userCredentials.id, id.toString()), eq(userCredentials.userId!, userId)));
    if (!existingCredential) {
      // Log security event for attempted hard deletion
      await logSecurityEvent(
        'credential_hard_deletion_denied',
        adminId,
        {
          credentialId: id,
          userId,
          reason: 'not_found',
        },
        'warning'
      );
      throw new Error('Credential not found');
    }
    // Permanently delete the credential
    await db
      .delete(userCredentials)
      .where(and(eq(userCredentials.id, id.toString()), eq(userCredentials.userId!, userId)));
    // Log security event
    await logSecurityEvent(
      'credential_hard_deleted',
      adminId,
      {
        credentialId: id,
        userId,
        serviceName: existingCredential.serviceName,
        credentialName: existingCredential.credentialName,
        reason,
      },
      'critical' // Hard deletion is a critical security event
    );
    return true;
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    if (
      isCredentialError(err) && errorMessage !== 'Credential not found'
    ) {
      error('Failed to hard delete user credential:', err);
      // Log security event
      await logSecurityEvent(
        'credential_hard_deletion_error',
        adminId,
        {
          credentialId: id,
          userId,
          error: errorMessage,
        },
        'error'
      );
    }
    throw err;
  }
}

/**
 * Get credential by service name with decrypted payload
 *
 * @param userId - User ID
 * @param serviceName - Service name
 * @param credentialName - Optional credential name (if user has multiple for same service)
 * @returns Credential with decrypted payload
 */
export async function getUserCredentialByService(
  userId: string,
  serviceName: string,
  credentialName?: string
): Promise<{ credential: UserCredential; payload: CredentialPayload }> {
  try {
    // Build query conditions
    const conditions = [
      eq(userCredentials.userId!, userId),
      eq(userCredentials.serviceName, serviceName),
      eq(userCredentials.active, true),
    ];
    if (credentialName) {
      conditions.push(eq(userCredentials.credentialName, credentialName));
    }
    // Query for the credential
    const [credential] = await db
      .select()
      .from(userCredentials)
      .where(and(...conditions))
      .orderBy(desc(userCredentials.updatedAt)); // Get most recently updated if multiple
    if (!credential) {
      // Log security event for attempted access
      await logSecurityEvent(
        'credential_service_access_denied',
        userId,
        {
          serviceName,
          credentialName: credentialName || 'any',
          reason: 'not_found',
        },
        'info' // This is often just a normal "not found" case
      );
      throw new Error(`No active credential found for service: ${serviceName}`);
    }
    // Update last used timestamp
    await db
      .update(userCredentials)
      .set({
        lastUsed: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userCredentials.id, credential.id));
    // Decrypt the payload
    const payload = decryptData(
      credential.encryptedPayload,
      credential.iv,
      credential.authTag,
      userId
    ) as CredentialPayload;
    // Log access
    await logSecurityEvent(
      'credential_service_accessed',
      userId,
      {
        credentialId: credential.id,
        serviceName,
      },
      'info'
    );
    return {
      credential,
      payload,
    };
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    if (
      isCredentialError(err) && !errorMessage.includes('No active credential found')
    ) {
      error('Error getting active credential:', err);
    }
    throw err;
  }
}
