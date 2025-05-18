# Performance Best Practices

This document outlines best practices for optimizing the performance of the AgentFlow application.

## Table of Contents

1. [Database Optimization](#database-optimization)
2. [API Response Caching](#api-response-caching)
3. [Performance Monitoring](#performance-monitoring)
4. [Frontend Optimization](#frontend-optimization)
5. [Memory Management](#memory-management)

## Database Optimization

### Use Indexes Effectively

Indexes can significantly improve query performance, but they come with a cost. Use them wisely:

- Add indexes to columns used in `WHERE` clauses
- Add indexes to columns used in `ORDER BY` clauses
- Add indexes to columns used in `JOIN` conditions
- Use composite indexes for multi-column filters
- Avoid over-indexing as it slows down writes

Example:

```sql
-- Add index to frequently queried column
CREATE INDEX idx_task_logs_status ON task_logs (status);

-- Add composite index for multi-column filters
CREATE INDEX idx_task_logs_user_status ON task_logs (user_id, status);
```

### Optimize Queries

- Use `EXPLAIN ANALYZE` to understand query execution plans
- Avoid `SELECT *` and only select the columns you need
- Use pagination to limit result sets
- Use appropriate join types (INNER, LEFT, etc.)
- Consider denormalizing data for read-heavy operations

Example of using the query optimizer:

```typescript
import { explainQuery } from '../services/dbOptimizationService.js';

// Analyze a query
const queryPlan = await explainQuery('SELECT * FROM task_logs WHERE status = $1');
console.log(queryPlan);
```

### Use Connection Pooling

Connection pooling reduces the overhead of creating new database connections:

```typescript
// The db.js module already implements connection pooling
import { db } from '../shared/db.js';

// Use the pooled connection
const result = await db.select().from(taskLogs);
```

## API Response Caching

### When to Use Caching

- Cache frequently accessed, rarely changing data
- Use short TTL for data that changes frequently
- Use longer TTL for reference data that rarely changes
- Clear cache when data is updated

### Implementing Caching

Use the caching middleware for API endpoints:

```typescript
import { cacheMiddleware } from '../middleware/cache.js';

// Cache GET /api/tasks for 5 minutes
router.get('/tasks', cacheMiddleware({ ttl: 300 }), async (req, res) => {
  // This response will be cached
  const tasks = await getTaskLogs('all');
  res.json(tasks);
});
```

### Cache Invalidation

Clear the cache when data changes:

```typescript
import { clearCacheKey } from '../middleware/cache.js';

// Clear cache for a specific endpoint
clearCacheKey('GET:/api/tasks');
```

## Performance Monitoring

### Monitoring API Performance

Use the performance monitoring middleware to track API performance:

```typescript
import { performanceMonitoring } from '../middleware/performance.js';

// Apply to all routes
app.use(performanceMonitoring);

// Get performance metrics
import { getPerformanceMetrics } from '../middleware/performance.js';
const metrics = getPerformanceMetrics();
```

### Monitoring System Performance

Use the performance monitoring service to track system performance:

```typescript
import { startPerformanceMonitoring, getSystemMetrics } from '../services/performanceMonitor.js';

// Start performance monitoring
startPerformanceMonitoring();

// Get current system metrics
const metrics = getSystemMetrics();
```

## Frontend Optimization

### Bundle Optimization

- Use code splitting to reduce initial load time
- Minify and compress JavaScript and CSS
- Use tree shaking to eliminate unused code
- Implement lazy loading for components

### Network Optimization

- Use HTTP/2 for multiplexing requests
- Implement content compression (gzip, Brotli)
- Use CDN for static assets
- Implement browser caching with appropriate cache headers

## Memory Management

### Node.js Memory Management

- Monitor memory usage with `process.memoryUsage()`
- Use streams for processing large files
- Implement garbage collection hints for large operations
- Consider worker threads for CPU-intensive tasks

Example of monitoring memory usage:

```typescript
// Log memory usage
const memoryUsage = process.memoryUsage();
console.log(`Memory usage: ${memoryUsage.heapUsed / 1024 / 1024} MB`);
```

### Memory Leaks

Watch for common causes of memory leaks:

- Event listeners that aren't removed
- Closures that reference large objects
- Caches that grow unbounded
- Promises that never resolve or reject

## Performance Testing

### Load Testing

Use tools like k6, Artillery, or JMeter to perform load testing:

```bash
# Install k6
npm install -g k6

# Run a load test
k6 run load-test.js
```

### Benchmarking

Benchmark critical code paths:

```typescript
// Simple benchmarking function
function benchmark(fn: Function, iterations: number = 1000): number {
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  return Date.now() - start;
}

// Usage
const time = benchmark(() => {
  // Code to benchmark
});
console.log(`Execution time: ${time}ms`);
```
