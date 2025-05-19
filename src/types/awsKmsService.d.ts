declare module 'awsKmsService' {
  export interface KmsOptions {
    region?: string;
    keyId?: string;
    enabled?: boolean;
    keyAlias?: string;
  }

  export function initializeKmsService(options?: KmsOptions): Promise<void>;
  export function createKey(description: string): Promise<string>;
  export function scheduleKeyDeletion(keyId: string, pendingWindowInDays: number): Promise<void>;
  export function logSecurityEvent(eventType: string, userId?: string, metadata?: Record<string, unknown>): Promise<void>;
}
