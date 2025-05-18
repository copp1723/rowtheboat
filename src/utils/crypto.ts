import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // For GCM, 12 bytes is recommended
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Encrypts data using AES-256-GCM
 * @param data - Plaintext data to encrypt
 * @param key - Encryption key (must be 32 bytes for AES-256)
 * @returns Encrypted data as base64 string (format: iv:authTag:ciphertext)
 */
export function encrypt(data: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted data
 * @param encryptedData - Encrypted data in format iv:authTag:ciphertext
 * @param key - Encryption key (must match key used for encryption)
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string, key: Buffer): string {
  const [ivBase64, authTagBase64, ciphertext] = encryptedData.split(':');
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Derives a consistent encryption key from a passphrase
 * @param passphrase - Passphrase to derive key from
 * @param salt - Optional salt (if not provided, will use fixed salt from env)
 * @returns Derived key as Buffer (32 bytes for AES-256)
 */
export function deriveKey(passphrase: string, salt?: string): Buffer {
  const saltToUse = salt || process.env.ENCRYPTION_SALT || 'default-fixed-salt';
  return crypto.pbkdf2Sync(
    passphrase,
    saltToUse,
    100000, // iterations
    KEY_LENGTH,
    'sha512'
  );
}
