declare module 'dbHealthCheck' {
  import { HealthCheckResult } from 'healthService';

  /**
   * Check PostgreSQL health
   * 
   * @returns Health check result
   */
  export function checkPostgresHealth(): Promise<HealthCheckResult>;
}
