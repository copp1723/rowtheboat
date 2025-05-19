/**
 * Enhanced Encryption Utilities
 *
 * Provides secure encryption/decryption using AES-256-GCM with proper authentication
 * and environment validation for production security.
 */
import crypto from 'crypto';
import { isError } from '../utils/errorUtils.js';
import { db } from '../shared/db.js';
import { securityAuditLogs } from '../shared/schema.js';
import { debug, info, warn, error } from '../shared/logger.js';
// Constants for encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM mode
const KEY_LENGTH = 32; // 32 bytes (256 bits) for AES-256
// Environment variable for encryption key
// In production, this should be a secure, randomly generated key
const DEFAULT_KEY = 'default-dev-key-do-not-use-in-production-environment';
// Derive a proper length key from the environment variable or use a default (for development only)
let encryptionKey: Buffer;
/**
 * Initialize the encryption module
 * This should be called at application startup
 *
 * @param env - Optional environment object for testing
 * @returns true if initialization was successful
 */
export function initializeEncryption(env = process.env): boolean {
  try {
    const keyString = env.ENCRYPTION_KEY;
    if (!keyString) {
      if (env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY environment variable is required in production');
      }
      // For development, derive a key from the default
      // This is NOT secure for production use
      warn('Using default encryption key. This is NOT secure for production.');
      encryptionKey = crypto.scryptSync(DEFAULT_KEY, 'salt', KEY_LENGTH);
      return false;
    }
    // If key is provided as hex string
    if (/^[0-9a-f]{64}$/i.test(keyString)) {
      encryptionKey = Buffer.from(keyString, 'hex');
    }
    // If key is provided as base64 string
    else if (/^[A-Za-z0-9+/=]{44}$/.test(keyString)) {
      encryptionKey = Buffer.from(keyString, 'base64');
    }
    // Otherwise, derive a key from the provided string
    else {
      encryptionKey = crypto.scryptSync(keyString, 'salt', KEY_LENGTH);
    }
    return true;
  } catch (error) {
    error('Failed to initialize encryption:', error);
    // In development, fall back to default key
    if (env.NODE_ENV !== 'production') {
      encryptionKey = crypto.scryptSync(DEFAULT_KEY, 'salt', KEY_LENGTH);
      return false;
    }
    throw error;
  }
}
/**
 * Checks if encryption is properly configured for production use
 * @returns true if a proper encryption key is configured
 */
export function isEncryptionConfigured(): boolean {
  if (!encryptionKey) {
    initializeEncryption();
  }
  // In production, we should never use the default key
  if (process.env.NODE_ENV === 'production') {
    return (
      encryptionKey.toString('hex') !==
      crypto.scryptSync(DEFAULT_KEY, 'salt', KEY_LENGTH).toString('hex')
    );
  }
  return true;
}
/**
 * Encrypt data using AES-256-GCM
 *
 * @param data - Data to encrypt (object or string)
 * @param userId - Optional user ID for audit logging
 * @returns Object containing encrypted data, IV, and authentication tag
 */
export function encryptData(
  data: Record<string, any> | string,
  userId?: string
): {
  encryptedData: string;
  iv: string;
  authTag: string;
} {
  try {
    if (!encryptionKey) {
      initializeEncryption();
    }
    // Convert data to string if it's an object
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    // Create cipher with key and IV
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
    // Encrypt the data
    let encrypted = cipher.update(dataString, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    return {
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  } catch (error) {
    // Unified error message handling
    const errorMessage = isError(error) 
      ? error instanceof Error 
        ? error.message 
        : String(error)
      : String(error);
    
    error(`Encryption error: ${errorMessage}`);
    throw new Error(`Encryption failed: ${errorMessage}`);
  }
}
/**
 * Decrypt data that was encrypted with AES-256-GCM
 *
 * @param encryptedData - The encrypted data string (base64)
 * @param iv - The initialization vector (base64)
 * @param authTag - The authentication tag (base64)
 * @param userId - Optional user ID for audit logging
 * @returns Decrypted data (parsed as JSON if it's valid JSON)
 */
export function decryptData(
  encryptedData: string,
  iv: string,
  authTag: string,
  userId?: string
): any {
  try {
    if (!encryptionKey) {
      initializeEncryption();
    }
    // Convert base64 strings to buffers
    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, ivBuffer);
    // Set auth tag
    decipher.setAuthTag(authTagBuffer);
    // Decrypt
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    // Try to parse as JSON if possible
    try {
      return JSON.parse(decrypted);
    } catch {
      // If not valid JSON, return as string
      return decrypted;
    }
  } catch (error) {
    // Unified error message handling
    const errorMessage = isError(error) 
      ? error instanceof Error 
        ? error.message 
        : String(error)
      : String(error);
    
    error(`Decryption error: ${errorMessage}`);
    throw new Error(`Decryption failed: ${errorMessage}`);
  }
}
/**
 * Legacy decrypt function for backward compatibility
 * This handles data encrypted with the old CBC mode
 *
 * @param encryptedData - The encrypted data string
 * @param iv - The initialization vector
 * @returns Decrypted data as an object
 * @deprecated Use the GCM version instead
 */
export function legacyDecryptData(encryptedData: string, iv: string): Record<string, any> {
  try {
    // For backward compatibility, derive key the same way
    const legacyKey = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
    // Use the crypto-js library for backward compatibility
    const CryptoJS = require('crypto-js');
    // Convert IV from string to WordArray
    const ivParams = CryptoJS.enc.Hex.parse(iv);
    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptedData, legacyKey, {
      iv: ivParams,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    // Convert to string and parse as JSON
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) {
      throw new Error('Legacy decryption failed - invalid key or corrupted data');
    }
    return JSON.parse(decryptedString);
  } catch (error) {
    error('Failed to decrypt legacy data:', error);
    throw new Error(
      'Legacy decryption failed - data may be corrupted or encryption key is invalid'
    );
  }
}
/**
 * Unified credential payload structure
 * This ensures consistent structure for all credential data
 */
export interface CredentialPayload {
  // Core credential fields
  username?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  // Additional fields
  tokenType?: string;
  expiresAt?: string;
  scopes?: string[];
  // Service-specific fields
  [key: string]: any;
}
/**
 * Log a security-related event to the audit log
 *
 * @param eventType - Type of security event
 * @param userId - User ID associated with the event (if applicable)
 * @param eventData - Additional data about the event (no sensitive data)
 * @param severity - Severity level of the event
 */
export async function logSecurityEvent(
  eventType: string,
  userId?: string,
  eventData: Record<string, any> = {},
  severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
): Promise<void> {
  try {
    await db.insert(securityAuditLogs).values({
      userId,
      eventType,
      eventData,
      severity,
      timestamp: new Date(),
    });
  } catch (error) {
    // Unified error message handling
    const errorMessage = isError(error) 
      ? error instanceof Error 
        ? error.message 
        : String(error)
      : String(error);
    
    error(`Security event logging error: ${errorMessage}`);
  }
}
/**
 * Test the encryption functionality
 * @returns true if encryption and decryption work correctly
 */
export function testEncryption(): boolean {
  try {
    // Test data
    const testData = {
      username: 'test@example.com',
      password: 'password123',
      apiKey: 'sk_test_12345',
      timestamp: new Date().toISOString(),
    };
    // Encrypt
    const { encryptedData, iv, authTag } = encryptData(testData);
    // Decrypt
    const decrypted = decryptData(encryptedData, iv, authTag);
    // Verify all fields match
    return (
      decrypted.username === testData.username &&
      decrypted.password === testData.password &&
      decrypted.apiKey === testData.apiKey &&
      decrypted.timestamp === testData.timestamp
    );
  } catch (error) {
    error('Encryption test failed:', error);
    return false;
  }
}
// Initialize encryption on module load
initializeEncryption();
