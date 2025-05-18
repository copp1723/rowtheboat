# Database Connection Management Approach

This document describes the approach used for robust, production-ready database connection management in this project.

## Key Features

- **Connection Pooling**: Uses `postgres-js` with a configurable pool size for efficient resource usage.
- **Retry Logic**: Implements automatic retry with exponential backoff for connection attempts and queries.
- **Health Checks**: Exposes a `dbHealthCheck()` function to verify database connectivity and latency.
- **Graceful Shutdown**: Cleans up and closes all database connections on application shutdown (SIGINT/SIGTERM).
- **Metrics**: Tracks query count, last query time, and last error for monitoring and diagnostics.
- **Timeout Handling**: Sets connection, idle, and lifetime timeouts to prevent resource leaks and hanging connections.
- **Error Handling**: Captures and exposes the last error for debugging and alerting.

## Usage

- Import `db` for ORM queries via Drizzle.
- Use `dbQuery()` for direct queries with metrics.
- Call `dbHealthCheck()` for health monitoring endpoints.
- Use `getDbMetrics()` to retrieve pool/query metrics for dashboards or logs.
- On shutdown, `closeDbPool()` is called automatically to clean up resources.

## Example

```js
import { db, dbQuery, dbHealthCheck, getDbMetrics } from './src/shared/db.js';

// Run a query with metrics
await dbQuery`SELECT * FROM users`;

// Health check
const health = await dbHealthCheck();

// Get metrics
const metrics = getDbMetrics();
```

## Circuit Breaker Pattern

For advanced reliability, consider wrapping critical DB operations with a circuit breaker (see `src/docs/RETRY_AND_CIRCUIT_BREAKER.md`).

## Monitoring

- Integrate `getDbMetrics()` with your monitoring/alerting system.
- Log or expose metrics via a health endpoint for observability.

---

For further details, see the code in `src/shared/db.js` and related documentation.
