declare module '../services/kmsEncryptionService' {
  export interface EncryptionResult {
    ciphertext: string;
    keyId: string;
  }

  export function encrypt(plaintext: string, keyId?: string): Promise<EncryptionResult>;
  export function decrypt(ciphertext: string): Promise<string>;
}
