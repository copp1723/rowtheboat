#!/bin/bash
set -e

echo "Fixing userCredentialService.ts..."

# Create a temporary file
cat > temp_fix.ts << 'EOF'
/**
 * User Credential Service
 *
 * Manages secure storage and retrieval of user credentials for external services.
 */
import { eq, and, desc } from 'drizzle-orm';
import { isError } from '../../../../utils/errorUtils.js';
import { db } from '../../../../shared/db.js';
import { userCredentials } from '../../../../shared/schema.js';
import { encryptData, decryptData, isEncryptionConfigured, logSecurityEvent } from '../../../../utils/encryption.js';
import { debug, info, warn, error } from '../../../../shared/logger.js';

// Type definitions
export type CredentialPayload = Record<string, any>;

export interface UserCredential {
  id: string;
  userId?: string;
  serviceName: string;
  credentialName: string;
  encryptedPayload: string;
  iv: string;
  authTag: string;
  metadata?: Record<string, any>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
}

export type UpsertUserCredential = Omit<UserCredential, 'id'> & { id?: string };

/**
 * Helper function to get error message from various error types
 */
function getErrorMessage(err: unknown): string {
  if (isError(err)) {
    return err.message;
  }
  return String(err);
}

/**
 * Check if error is related to credential operations
 */
function isCredentialError(err: unknown): boolean {
  const errorMessage = getErrorMessage(err);
  return (
    errorMessage.includes('credential') ||
    errorMessage.includes('Credential') ||
    errorMessage.includes('encryption') ||
    errorMessage.includes('Encryption') ||
    errorMessage.includes('decrypt') ||
    errorMessage.includes('Decrypt')
  );
}

/**
 * Add a new credential for a user
 *
 * @param userId - User ID
 * @param serviceName - Service name (e.g., 'github', 'slack')
 * @param credentialName - Name for this credential (e.g., 'personal', 'work')
 * @param payload - Credential data to encrypt
 * @param metadata - Optional metadata about the credential
 * @param expiresAt - Optional expiration date
 * @returns Created credential
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
      const errorObj = new Error('Cannot add credentials: Encryption not properly configured');
      error(
        'Security violation: Attempted to add credentials without proper encryption',
        { userId, serviceName, credentialName }
      );
      // Log security event
      await logSecurityEvent(
        'encryption_not_configured',
        userId,
        { serviceName, action: 'add_credential' },
        'critical'
      );
      throw errorObj;
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
EOF

# Replace the first part of the file
sed -i '' -e '1,132s/.*//g' src/features/auth/services/userCredentialService.ts
cat temp_fix.ts > temp_combined.ts
tail -n +133 src/features/auth/services/userCredentialService.ts >> temp_combined.ts
mv temp_combined.ts src/features/auth/services/userCredentialService.ts

# Fix the remaining error function calls
sed -i '' -E 's/error\("'\''Error loading credential:'\'', error\);/error('\''Error loading credential:'\'', error);/g' src/features/auth/services/userCredentialService.ts
sed -i '' -E 's/error\("'\''Failed to list user credentials:'\'', error\);/error('\''Failed to list user credentials:'\'', error);/g' src/features/auth/services/userCredentialService.ts
sed -i '' -E 's/error\("'\''Error saving credential:'\'', error\);/error('\''Error saving credential:'\'', error);/g' src/features/auth/services/userCredentialService.ts
sed -i '' -E 's/error\("'\''Error deleting credential:'\'', error\);/error('\''Error deleting credential:'\'', error);/g' src/features/auth/services/userCredentialService.ts
sed -i '' -E 's/error\("'\''Failed to hard delete user credential:'\'', error\);/error('\''Failed to hard delete user credential:'\'', error);/g' src/features/auth/services/userCredentialService.ts
sed -i '' -E 's/error\("'\''Error getting active credential:'\'', error\);/error('\''Error getting active credential:'\'', error);/g' src/features/auth/services/userCredentialService.ts

# Clean up temporary files
rm temp_fix.ts

echo "Done fixing userCredentialService.ts."
