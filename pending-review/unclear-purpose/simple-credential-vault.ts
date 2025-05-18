import { sql } from 'drizzle-orm';
/**
 * Simple Credential Vault Implementation for Eko AI Agent
 *
 * This is a simplified version of the credential vault that avoids some
 * of the more complex TypeScript issues in the main implementation.
 *
 * Features:
 * - AES-256-GCM encryption for credentials
 * - User isolation with Row-Level Security
 * - CRUD operations for credential management
 */
import crypto from 'crypto';
import { db } from './shared/db.js';
import { credentials } from './shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';
// Key length for AES-256
const KEY_LENGTH = 32;
// IV length for AES-GCM
const IV_LENGTH = 16;
// Authentication tag length
const AUTH_TAG_LENGTH = 16;
let encryptionKey: Buffer;
/**
 * Initialize encryption with a key
 * In production, this should be a securely stored environment variable
 */
export function initializeEncryption(key?: string): void {
  if (key) {
    // Use provided key if available
    encryptionKey = Buffer.from(key, 'hex');
    if (encryptionKey.length !== KEY_LENGTH) {
      throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars)`);
    }
  } else {
    // Use environment variable or generate a temporary key (not for production)
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey) {
      encryptionKey = Buffer.from(envKey, 'hex');
      if (encryptionKey.length !== KEY_LENGTH) {
        console.warn(
          'Warning: Environment ENCRYPTION_KEY has incorrect length, generating temporary key'
        );
        encryptionKey = crypto.randomBytes(KEY_LENGTH);
      }
    } else {
      console.warn('Warning: Using temporary encryption key. Set ENCRYPTION_KEY in production.');
      encryptionKey = crypto.randomBytes(KEY_LENGTH);
    }
  }
}
/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  return !!encryptionKey && encryptionKey.length === KEY_LENGTH;
}
/**
 * Encrypt data with AES-256-GCM
 */
export function encryptData(data: any): { encryptedData: string; iv: string } {
  if (!isEncryptionConfigured()) {
    initializeEncryption();
  }
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);
  // Create cipher with key and IV
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  // Convert data to JSON string if it's an object
  const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
  // Encrypt data
  let encrypted = cipher.update(dataString, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  // Combine encrypted data and auth tag
  const encryptedWithTag = Buffer.concat([Buffer.from(encrypted, 'base64'), authTag]).toString(
    'base64'
  );
  return {
    encryptedData: encryptedWithTag,
    iv: iv.toString('base64'),
  };
}
/**
 * Decrypt data with AES-256-GCM
 */
export function decryptData(encryptedData: string, iv: string): any {
  if (!isEncryptionConfigured()) {
    initializeEncryption();
  }
  try {
    // Decode base64 strings
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    // Extract auth tag (last 16 bytes)
    const authTag = encryptedBuffer.slice(encryptedBuffer.length - AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.slice(0, encryptedBuffer.length - AUTH_TAG_LENGTH);
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, ivBuffer);
    decipher.setAuthTag(authTag);
    // Decrypt data
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    // Parse JSON if possible
    try {
      return JSON.parse(decrypted.toString('utf8'));
    } catch (e) {
      // Return as string if not valid JSON
      return decrypted.toString('utf8');
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error instanceof Error
          ? error instanceof Error
            ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
            : String(error)
          : String(error)
        : 'Unknown error';
    throw new Error(`Decryption failed: ${errorMessage}`);
  }
}
/**
 * Test encryption/decryption
 */
export function testEncryption(): boolean {
  try {
    const testData = { test: 'value', number: 123 };
    const { encryptedData, iv } = encryptData(testData);
    const decrypted = decryptData(encryptedData, iv);
    return decrypted.test === testData.test && decrypted.number === testData.number;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}
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
 * Add a new credential
 */
export async function addCredential(
  userId: string,
  platform: string,
  data: CredentialData,
  options?: {
    label?: string | undefined;
    refreshToken?: string | undefined;
    refreshTokenExpiry?: Date | undefined;
  }
): Promise<any> {
  // Verify encryption is configured properly
  if (!isEncryptionConfigured()) {
    console.warn('Warning: Using default encryption key. Set ENCRYPTION_KEY in production.');
    initializeEncryption();
  }
  // Encrypt the credential data
  const { encryptedData, iv } = encryptData(data);
  // Insert the credential into the database
  const [credential] = await // @ts-ignore
  db
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
  return credential;
}
/**
 * Get a credential by ID
 */
export async function getCredentialById(
  id: string,
  userId: string
): Promise<{ credential: any; data: CredentialData }> {
  // Query the credential by ID ensuring it belongs to the user
  const [credential] = await db
    .select()
    .from(credentials)
    .where(
      and(
        eq(credentials.id, id.toString()),
        eq(credentials.userId!, userId),
        eq(credentials.active, true)
      )
    );
  if (!credential) {
    throw new Error(`Credential not found: ${id}`);
  }
  // Decrypt the credential data
  const data = decryptData(credential.encryptedData, credential.iv);
  return { credential, data };
}
/**
 * Get all credentials for a user
 */
export async function getCredentials(
  userId: string,
  platformFilter?: string
): Promise<Array<{ credential: any; data: CredentialData }>> {
  // Build query conditions
  let query = db
    .select()
    .from(credentials)
    .where(and(eq(credentials.userId!, userId), eq(credentials.active, true)));
  // Add platform filter if provided
  if (platformFilter) {
    // Cast to any to bypass TypeScript error
    query = (query as any).where(eq(credentials.platform!, platformFilter));
  }
  // Execute query
  const results = await query;
  // Decrypt all credentials
  return results.map((credential) => ({
    credential,
    data: decryptData(credential.encryptedData, credential.iv),
  }));
}
/**
 * Update a credential
 */
export async function updateCredential(
  id: string,
  userId: string,
  data?: CredentialData,
  options?: {
    label?: string | undefined;
    refreshToken?: string | undefined;
    refreshTokenExpiry?: Date | undefined;
    active?: boolean | undefined;
  }
): Promise<any> {
  // First verify the credential exists and belongs to this user
  const [existingCredential] = await db
    .select()
    .from(credentials)
    .where(and(eq(credentials.id, id.toString()), eq(credentials.userId!, userId)));
  if (!existingCredential) {
    throw new Error(`Credential not found: ${id}`);
  }
  // Prepare update data
  const updateData: any = {};
  // Update encrypted data if provided
  if (data) {
    const { encryptedData, iv } = encryptData(data);
    updateData.encryptedData = encryptedData;
    updateData.iv = iv;
  }
  // Add optional fields if provided
  if (options?.label !== undefined) updateData.label = options.label;
  if (options?.refreshToken !== undefined) updateData.refreshToken = options.refreshToken;
  if (options?.refreshTokenExpiry !== undefined)
    updateData.refreshTokenExpiry = options.refreshTokenExpiry;
  if (options?.active !== undefined) updateData.active = options.active;
  // Always update the timestamp
  updateData.updatedAt = new Date();
  // Update the credential
  const [updated] = await // @ts-ignore
  db
    .update(credentials)
    .set(updateData)
    .where(and(eq(credentials.id, id.toString()), eq(credentials.userId!, userId)))
    .returning();
  return updated;
}
/**
 * Soft delete a credential (mark as inactive)
 */
export async function deleteCredential(id: string, userId: string): Promise<boolean> {
  try {
    const result = await updateCredential(id, userId, undefined, { active: false });
    return !!result;
  } catch (error) {
    console.error('Error soft-deleting credential:', error);
    return false;
  }
}
/**
 * Hard delete a credential (remove from database)
 */
export async function hardDeleteCredential(id: string, userId: string): Promise<boolean> {
  try {
    const result = await // @ts-ignore
    db
      .delete(credentials)
      .where(and(eq(credentials.id, id.toString()), eq(credentials.userId!, userId)))
      .returning({ id: sql`${credentials.id}` });
    return result.length > 0;
  } catch (error) {
    console.error('Error hard-deleting credential:', error);
    return false;
  }
}
