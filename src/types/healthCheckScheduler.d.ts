declare module 'healthCheckScheduler' {
  /**
   * Start all health checks on a schedule
   * 
   * @param schedule - Cron schedule for health checks (default: every 5 minutes)
   */
  export function startAllHealthChecks(schedule?: string): void;
  
  /**
   * Stop all scheduled health checks
   */
  export function stopAllHealthChecks(): void;
  
  /**
   * Get the current health check schedule
   * 
   * @returns The current cron schedule or null if not running
   */
  export function getHealthCheckSchedule(): string | null;
}
