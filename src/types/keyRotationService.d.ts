declare module '../services/keyRotationService' {
  export interface RotationOptions {
    deleteOldKeys?: boolean;
    minKeyAgeDays?: number;
  }

  export function rotateKeys(options?: RotationOptions): Promise<void>;
  export function getActiveKeyId(): Promise<string>;
}
