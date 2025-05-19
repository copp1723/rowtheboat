declare module 'healthService' {
  /**
   * Result of a health check
   */
  export interface HealthCheckResult {
    /**
     * Unique identifier for the health check
     */
    id: string;
    
    /**
     * Display name of the health check
     */
    name: string;
    
    /**
     * Status of the health check
     */
    status: 'ok' | 'warning' | 'error';
    
    /**
     * Response time in milliseconds
     */
    responseTime: number;
    
    /**
     * Timestamp of the last check
     */
    lastChecked: Date;
    
    /**
     * Human-readable message about the health check
     */
    message: string;
    
    /**
     * Additional details about the health check
     */
    details?: Record<string, any>;
  }

  /**
   * Entry in the health log
   */
  export interface HealthLogEntry {
    /**
     * Unique identifier for the log entry
     */
    id: string;
    
    /**
     * Identifier of the health check
     */
    checkId: string;
    
    /**
     * Timestamp of the log entry
     */
    timestamp: Date;
    
    /**
     * Status of the health check
     */
    status: 'ok' | 'warning' | 'error';
    
    /**
     * Response time in milliseconds
     */
    responseTime: number;
    
    /**
     * Human-readable message about the health check
     */
    message: string;
    
    /**
     * Additional details about the health check
     */
    details?: Record<string, any>;
  }

  /**
   * Register a new health check function
   * 
   * @param name - The name of the health check
   * @param checkFn - The function that performs the health check
   */
  export function registerHealthCheck(name: string, checkFn: () => Promise<HealthCheckResult>): void;
  
  /**
   * Run all registered health checks
   * 
   * @returns Results of all health checks
   */
  export function runAllHealthChecks(): Promise<HealthCheckResult[]>;
  
  /**
   * Run a specific health check by name
   * 
   * @param name - The name of the health check to run
   * @returns Result of the health check
   */
  export function runHealthCheck(name: string): Promise<HealthCheckResult | null>;
  
  /**
   * Get the most recent health check results
   * 
   * @returns List of the latest health check results for each service
   */
  export function getLatestHealthChecks(): Promise<HealthCheckResult[]>;
  
  /**
   * Get health logs for a specific check
   * 
   * @param checkId - ID of the health check
   * @param limit - Maximum number of logs to return
   * @returns List of health log entries
   */
  export function getHealthLogs(checkId: string, limit?: number): Promise<HealthLogEntry[]>;
  
  /**
   * Get a summary of system health
   * 
   * @returns Summary of the system health status
   */
  export function getHealthSummary(): Promise<{
    overallStatus: 'ok' | 'warning' | 'error';
    servicesCount: number;
    servicesOk: number;
    servicesWarning: number;
    servicesError: number;
    averageResponseTime: number;
    lastChecked: Date | null;
  }>;
  
  /**
   * Default health check for the database
   * 
   * @returns Health check result
   */
  export function checkDatabaseHealth(): Promise<HealthCheckResult>;
  
  /**
   * Health check for the email service
   * 
   * @returns Health check result
   */
  export function checkEmailService(): Promise<HealthCheckResult>;
  
  /**
   * Health check for the AI API (OpenAI)
   * 
   * @returns Health check result
   */
  export function checkAIService(): Promise<HealthCheckResult>;
  
  /**
   * Health check for the scheduler service
   * 
   * @returns Health check result
   */
  export function checkSchedulerService(): Promise<HealthCheckResult>;
}
