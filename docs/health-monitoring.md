# Health Monitoring System

The health monitoring system provides functionality to monitor the health and performance of various components in the application. It periodically checks the status of different services and APIs, and stores the results for display in a health dashboard.

## Components

The health monitoring system consists of the following components:

1. **Health Service**: Provides functions to register, run, and retrieve health checks.
2. **Health Check Scheduler**: Schedules periodic health checks using a cron-like syntax.
3. **Health API**: Exposes endpoints for checking system health and viewing health metrics.
4. **Health Dashboard**: A web interface for viewing health check results (if implemented).

## Health Checks

Health checks are functions that test the availability and performance of various services. Each health check returns a result with the following information:

- **Status**: `ok`, `warning`, or `error`
- **Response Time**: How long the check took to complete (in milliseconds)
- **Message**: A human-readable message describing the result
- **Details**: Additional information about the check (optional)

### Default Health Checks

The system includes the following default health checks:

- **Database**: Checks the connection to the PostgreSQL database
- **Redis**: Checks the connection to the Redis server
- **Email**: Checks if the email service is configured
- **AI**: Checks if the AI service (OpenAI) is configured
- **Scheduler**: Checks if the task scheduler is operational

### Custom Health Checks

You can register custom health checks by calling the `registerHealthCheck` function:

```typescript
import { registerHealthCheck } from '../services/healthService';

registerHealthCheck('my-service', async () => {
  // Perform health check
  return {
    id: 'my-service',
    name: 'My Service',
    status: 'ok',
    responseTime: 100,
    lastChecked: new Date(),
    message: 'My service is operational',
    details: {
      // Additional details
    }
  };
});
```

## Health Check Scheduler

The health check scheduler runs all registered health checks on a configurable schedule. By default, health checks run every 5 minutes.

### Configuration

You can configure the health check schedule by modifying the `startAllHealthChecks` call in `src/api/server.ts`:

```typescript
// Run health checks every hour
startAllHealthChecks('0 * * * *');
```

The schedule uses the cron syntax:

- `* * * * *`: Every minute
- `*/5 * * * *`: Every 5 minutes (default)
- `0 * * * *`: Every hour at minute 0
- `0 0 * * *`: Every day at midnight
- `0 0 * * 0`: Every Sunday at midnight

### Disabling the Scheduler

If you want to disable the health check scheduler, you can comment out the `startAllHealthChecks()` call in `src/api/server.ts`.

## Health API

The health API provides endpoints for checking system health and viewing health metrics.

### Endpoints

- `GET /api/health`: Returns a summary of system health
- `GET /api/health/checks`: Returns the latest health check results for all services
- `GET /api/health/checks/:id`: Returns the latest health check result for a specific service
- `POST /api/health/checks/:id/run`: Runs a health check for a specific service
- `GET /api/health/logs/:id`: Returns the health check logs for a specific service

## Troubleshooting

If you encounter issues with the health monitoring system, check the following:

1. **Database Connection**: Make sure the database is accessible and the connection string is correct.
2. **Redis Connection**: Make sure Redis is running and accessible.
3. **Scheduler**: Check if the cron schedule is valid.
4. **Logs**: Check the application logs for any errors related to health checks.

## Extending the System

To extend the health monitoring system, you can:

1. Add new health checks for additional services
2. Enhance the health dashboard with more detailed metrics
3. Add alerting functionality to notify administrators of health issues
4. Integrate with external monitoring systems

## Implementation Details

The health monitoring system is implemented in the following files:

- `src/services/healthService.ts`: Core health check functionality
- `src/services/healthCheckScheduler.ts`: Scheduler for periodic health checks
- `src/server/routes/health.ts`: API endpoints for health monitoring
- `src/services/dbHealthCheck.ts`: Database health check
- `src/services/redisHealthCheck.ts`: Redis health check
