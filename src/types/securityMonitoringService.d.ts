declare module 'securityMonitoringService' {
  /**
   * Configuration options for security monitoring
   */
  export interface SecurityMonitoringOptions {
    /**
     * Whether security monitoring is enabled
     */
    enabled?: boolean;
    
    /**
     * Cron schedule for security monitoring
     */
    schedule?: string;
    
    /**
     * Time window in minutes for security monitoring
     */
    timeWindowMinutes?: number;
    
    /**
     * Alert thresholds for security monitoring
     */
    alertThresholds?: {
      /**
       * Threshold for failed login attempts
       */
      failedLogins?: number;
      
      /**
       * Threshold for API key creation
       */
      apiKeyCreation?: number;
      
      /**
       * Threshold for permission denied events
       */
      permissionDenied?: number;
      
      /**
       * Threshold for encryption failures
       */
      encryptionFailures?: number;
    };
  }

  /**
   * Initialize security monitoring service
   * 
   * @param options - Configuration options
   */
  export function initializeSecurityMonitoring(options?: SecurityMonitoringOptions): Promise<void>;
  
  /**
   * Start security monitoring
   * 
   * @param schedule - Cron schedule for security monitoring
   */
  export function startSecurityMonitoring(schedule?: string): Promise<void>;
  
  /**
   * Stop security monitoring
   */
  export function stopSecurityMonitoring(): void;
  
  /**
   * Run security monitoring checks
   */
  export function runSecurityChecks(): Promise<void>;
  
  /**
   * Check for excessive failed login attempts
   */
  export function checkFailedLogins(): Promise<void>;
  
  /**
   * Check for excessive API key creation
   */
  export function checkApiKeyCreation(): Promise<void>;
  
  /**
   * Check for excessive permission denied events
   */
  export function checkPermissionDenied(): Promise<void>;
  
  /**
   * Check for excessive encryption failures
   */
  export function checkEncryptionFailures(): Promise<void>;
}
