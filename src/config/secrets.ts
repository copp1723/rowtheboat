/**
 * Secret Management Utilities
 *
 * Provides utilities for handling sensitive configuration values
 */
import crypto from 'crypto';
import { debug, info, warn, error } from '../shared/logger';
import { INSECURE_DEFAULT_VALUES } from './defaults.js';

// Encryption key for secrets
let encryptionKey: Buffer | null = null;

/**
 * Initialize the encryption key for secrets
 *
 * @param key - The encryption key as a string
 * @returns true if initialization was successful
 */
export function initializeSecrets(key: string): boolean {
  try {
    // Check if the key is a known default value
    if (isDefaultValue('ENCRYPTION_KEY', key)) {
      warn('Using a default encryption key. This is insecure for production use.');

      if (process.env.NODE_ENV === 'production') {
        error('Default encryption key detected in production environment. This is a security risk.');
        return false;
      }
    }

    // Convert the key to a buffer
    encryptionKey = Buffer.from(key, 'utf-8');

    // Ensure the key is at least 32 bytes (256 bits) for AES-256
    if (encryptionKey.length < 32) {
      // If key is too short, derive a 32-byte key using PBKDF2
      encryptionKey = crypto.pbkdf2Sync(key, 'agentflow-salt', 10000, 32, 'sha256');
    } else if (encryptionKey.length > 32) {
      // If key is too long, truncate to 32 bytes
      encryptionKey = encryptionKey.subarray(0, 32);
    }

    return true;
  } catch (err) {
    error('Failed to initialize encryption key for secrets', err);
    return false;
  }
}

/**
 * Encrypt a sensitive value
 *
 * @param value - The value to encrypt
 * @returns The encrypted value as a string
 * @throws Error if encryption key is not initialized
 */
export function encryptSecret(value: string): string {
  if (!encryptionKey) {
    throw new Error('Encryption key not initialized. Call initializeSecrets first.');
  }

  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);

  // Encrypt the value
  let encrypted = cipher.update(value, 'utf-8', 'hex');
  encrypted += cipher.final('hex');

  // Get the authentication tag
  const authTag = cipher.getAuthTag();

  // Return the IV, encrypted value, and authentication tag as a single string
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypt a sensitive value
 *
 * @param encryptedValue - The encrypted value as a string
 * @returns The decrypted value
 * @throws Error if encryption key is not initialized or decryption fails
 */
export function decryptSecret(encryptedValue: string): string {
  if (!encryptionKey) {
    throw new Error('Encryption key not initialized. Call initializeSecrets first.');
  }

  // Split the encrypted value into IV, encrypted data, and authentication tag
  const [ivHex, encrypted, authTagHex] = encryptedValue.split(':');

  if (!ivHex || !encrypted || !authTagHex) {
    throw new Error('Invalid encrypted value format');
  }

  // Convert hex strings back to buffers
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the value
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}

/**
 * Check if a value is a known default/insecure value
 *
 * @param key - Environment variable name
 * @param value - Environment variable value
 * @returns true if the value is a known default value
 */
export function isDefaultValue(key: string, value: string): boolean {
  if (!value) return false;

  const defaults = INSECURE_DEFAULT_VALUES[key as keyof typeof INSECURE_DEFAULT_VALUES];
  if (!defaults) return false;

  return defaults.includes(value);
}

/**
 * Mask a sensitive value for logging
 *
 * @param value - The sensitive value to mask
 * @returns The masked value
 */
export function maskSecret(value: string): string {
  if (!value) return '';

  if (value.length <= 8) {
    return '********';
  }

  // Show first 4 and last 4 characters, mask the rest
  return `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
}
