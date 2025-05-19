# Logging Standards and Best Practices

This document outlines the logging standards and best practices for the Row The Boat application. Following these guidelines ensures consistent, useful logs across the codebase.

## Table of Contents

1. [Logging Architecture](#logging-architecture)
2. [Log Levels](#log-levels)
3. [Importing and Using the Logger](#importing-and-using-the-logger)
4. [Structured Logging](#structured-logging)
5. [Context and Metadata](#context-and-metadata)
6. [Error Logging](#error-logging)
7. [Performance Logging](#performance-logging)
8. [Security Logging](#security-logging)
9. [Best Practices](#best-practices)
10. [Log Rotation and Retention](#log-rotation-and-retention)

## Logging Architecture

The application uses a centralized logging system based on Winston with the following features:

- Multiple transports (console, file)
- Structured JSON logging
- Log levels based on environment
- Contextual metadata
- File-based logging for persistence

The main logger is defined in `src/shared/logger.ts` and should be used throughout the application.

## Log Levels

The application uses the following log levels, in order of increasing severity:

| Level | Description | When to Use |
|-------|-------------|-------------|
| `debug` | Detailed information for debugging | Development-time information, verbose details |
| `info` | General information about system operation | Normal operation events, workflow progress |
| `warn` | Warning conditions | Non-critical issues, deprecated features, potential problems |
| `error` | Error conditions | Exceptions, failures that affect functionality |
| `fatal` | Critical errors that cause application failure | Severe errors requiring immediate attention |

The default log level is determined by the environment:
- Development: `debug`
- Test: `error`
- Production: `info`

You can override the default log level using the `LOG_LEVEL` environment variable.

## Importing and Using the Logger

### Correct Import Pattern

Always import the specific logging functions you need from the shared logger module:

```typescript
import { debug, info, warn, error, fatal } from '../shared/logger';

// Usage
info('User logged in successfully', { userId: '123' });
error('Failed to process payment', { orderId: '456', error: err.message });
```

### Incorrect Import Patterns

Do NOT import the logger as a default import or as a named `logger` import:

```typescript
// ❌ INCORRECT
import logger from '../shared/logger';
logger.info('Message'); // Wrong

// ❌ INCORRECT
import { logger } from '../shared/logger';
logger.info('Message'); // Wrong
```

## Structured Logging

All logs should use structured logging with metadata objects:

```typescript
// ✅ CORRECT
info('Processing order', { orderId: '123', items: 5, total: 99.99 });

// ❌ INCORRECT
info(`Processing order ${orderId} with ${items} items and total ${total}`);
```

Benefits of structured logging:
- Easier to parse and search
- Better for log aggregation tools
- More consistent format
- Enables filtering and querying

## Context and Metadata

Include relevant context in log metadata:

```typescript
info('User action completed', {
  userId: user.id,
  action: 'create_order',
  duration: endTime - startTime,
  result: 'success'
});
```

Common metadata fields to include:
- `userId`: ID of the user performing the action
- `requestId`: Unique ID for the request (for tracing)
- `action`: The specific action being performed
- `duration`: Time taken to perform the action (in ms)
- `result`: Outcome of the action

## Error Logging

When logging errors, include the error object in the metadata:

```typescript
try {
  await processOrder(order);
} catch (err) {
  error('Failed to process order', {
    orderId: order.id,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    code: err instanceof Error ? (err as any).code : undefined
  });
}
```

For operational errors (expected errors), use `warn` instead of `error`:

```typescript
if (!user) {
  warn('User not found', { userId: requestedId });
  return res.status(404).json({ error: 'User not found' });
}
```

## Performance Logging

For performance-sensitive operations, log timing information:

```typescript
const startTime = Date.now();
try {
  const result = await expensiveOperation();
  const duration = Date.now() - startTime;
  
  info('Expensive operation completed', {
    operation: 'generate_insights',
    duration,
    resultSize: result.length
  });
  
  return result;
} catch (err) {
  const duration = Date.now() - startTime;
  error('Expensive operation failed', {
    operation: 'generate_insights',
    duration,
    error: err instanceof Error ? err.message : String(err)
  });
  throw err;
}
```

## Security Logging

Security-related events should be logged with appropriate context:

```typescript
// Authentication attempts
info('Authentication attempt', {
  username: req.body.username,
  success: isAuthenticated,
  ip: req.ip,
  userAgent: req.headers['user-agent']
});

// Permission checks
warn('Permission denied', {
  userId: user.id,
  resource: 'orders',
  action: 'delete',
  resourceId: orderId
});

// Data access
info('Sensitive data accessed', {
  userId: user.id,
  dataType: 'customer_records',
  recordCount: records.length
});
```

## Best Practices

1. **Be Consistent**: Use the same logging pattern throughout the codebase
2. **Log Actionable Information**: Log information that helps diagnose issues
3. **Don't Log Sensitive Data**: Never log passwords, tokens, or PII
4. **Use Appropriate Levels**: Don't use `error` for non-error conditions
5. **Include Context**: Always include relevant metadata
6. **Be Concise**: Keep log messages clear and to the point
7. **Use Structured Data**: Use metadata objects instead of string interpolation
8. **Log at Service Boundaries**: Log inputs and outputs of service calls
9. **Log State Transitions**: Log when important state changes occur
10. **Include Correlation IDs**: Use request IDs to correlate logs across services

## Log Rotation and Retention

The application uses the following log rotation and retention policy:

- Log files are rotated daily
- Logs are retained for 30 days in production
- Each log file is named with the date (e.g., `application-2023-05-15.log`)

This is configured in the logging system and doesn't require developer intervention.

## Examples

### API Request Logging

```typescript
// At the beginning of a request
info('API request received', {
  method: req.method,
  path: req.path,
  ip: req.ip,
  userId: req.user?.id || 'anonymous',
  requestId: req.id
});

// At the end of a request
info('API request completed', {
  method: req.method,
  path: req.path,
  statusCode: res.statusCode,
  duration: Date.now() - req.startTime,
  requestId: req.id
});
```

### Service Operation Logging

```typescript
// Starting an operation
info('Starting insight generation', {
  dealerId: dealer.id,
  reportType: 'sales',
  date: reportDate.toISOString()
});

// Completing an operation
info('Completed insight generation', {
  dealerId: dealer.id,
  reportType: 'sales',
  insightCount: insights.length,
  duration: Date.now() - startTime
});
```

### Background Job Logging

```typescript
// Job started
info('Job started', {
  jobId: job.id,
  jobType: 'email_report',
  attempt: job.attemptsMade + 1
});

// Job completed
info('Job completed', {
  jobId: job.id,
  jobType: 'email_report',
  duration: Date.now() - startTime,
  result: 'success'
});

// Job failed
error('Job failed', {
  jobId: job.id,
  jobType: 'email_report',
  attempt: job.attemptsMade,
  error: err.message,
  willRetry: job.attemptsMade < job.opts.attempts
});
```
