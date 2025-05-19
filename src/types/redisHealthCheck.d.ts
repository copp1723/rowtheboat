declare module 'redisHealthCheck' {
  import { HealthCheckResult } from 'healthService';

  /**
   * Check Redis health
   * 
   * @returns Health check result
   */
  export function checkRedisHealth(): Promise<HealthCheckResult>;
}
