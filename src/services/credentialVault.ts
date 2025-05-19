/**
 * Credential Vault Service
 *
 * This service provides secure storage and retrieval of credentials
 * with encryption and user isolation.
 */
import { db } from '../shared/db';
import { credentials } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { debug, info, warn, error } from '../shared/logger';
import { encryptData, decryptData, isEncryptionConfigured } from '../utils/encryption';
import { isError } from '../utils/errorUtils';

/**
 * Credential data interface
 */
export interface CredentialData {
  username?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  tokenType?: string;
  accessToken?: string;
  dealerId?: string;
  [key: string]: string | undefined;
}

/**
 * Get a credential by ID
 * @param id - Credential ID
 * @param userId - User ID for security verification
 * @returns The credential and decrypted data, or null if not found
 */
export async function getCredentialById(
  id: string,
  userId: string
): Promise<{ credential: any; data: CredentialData } | null> {
  try {
    // Query the credential by ID ensuring it belongs to the user
    const [credential] = await db
      .select()
      .from(credentials)
      .where(
        and(
          eq(credentials.id, id),
          eq(credentials.userId!, userId),
          eq(credentials.active, true)
        )
      );

    if (!credential) {
      warn(`Credential not found: ${id} for user ${userId}`);
      return null;
    }

    // Decrypt the credential data
    const data = decryptData(credential.encryptedData, credential.iv);

    return { credential, data };
  } catch (err) {
    error('Failed to get credential by ID:', isError(err) ? err : String(err));
    return null;
  }
}

/**
 * Add a new credential
 * @param userId - User ID who owns this credential
 * @param platform - Platform name (e.g., 'openai', 'vinsolutions')
 * @param data - Credential data to encrypt and store
 * @param options - Additional options
 * @returns The created credential or null if failed
 */
export async function addCredential(
  userId: string,
  platform: string,
  data: CredentialData,
  options?: {
    label?: string;
    refreshToken?: string;
    refreshTokenExpiry?: Date;
  }
): Promise<any | null> {
  try {
    // Verify encryption is configured properly
    if (!isEncryptionConfigured()) {
      warn('Using default encryption key. Set ENCRYPTION_KEY in production.');
    }

    // Encrypt the credential data
    const { encryptedData, iv } = encryptData(data);

    // Insert the credential into the database
    const [credential] = await db
      .insert(credentials)
      .values({
        userId,
        platform,
        label: options?.label || null,
        encryptedData,
        iv,
        refreshToken: options?.refreshToken || null,
        refreshTokenExpiry: options?.refreshTokenExpiry || null,
        active: true,
      })
      .returning();

    info(`Credential added for user ${userId} on platform ${platform}`);
    return credential;
  } catch (err) {
    error('Failed to add credential:', isError(err) ? err : String(err));
    return null;
  }
}

/**
 * Get all credentials for a user
 * @param userId - User ID
 * @param platformFilter - Optional platform filter
 * @returns Array of credentials with decrypted data
 */
export async function getCredentials(
  userId: string,
  platformFilter?: string
): Promise<Array<{ credential: any; data: CredentialData }>> {
  try {
    // Build query conditions
    let query = db
      .select()
      .from(credentials)
      .where(and(eq(credentials.userId!, userId), eq(credentials.active, true)));

    // Add platform filter if provided
    if (platformFilter) {
      query = query.where(eq(credentials.platform!, platformFilter));
    }

    // Execute query
    const results = await query;

    // Decrypt all credentials
    return results.map((credential) => ({
      credential,
      data: decryptData(credential.encryptedData, credential.iv),
    }));
  } catch (err) {
    error('Failed to get credentials:', isError(err) ? err : String(err));
    return [];
  }
}

export default {
  getCredentialById,
  addCredential,
  getCredentials,
};
