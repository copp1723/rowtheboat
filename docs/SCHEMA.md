# Database Schema Documentation

This document provides a comprehensive overview of the AgentFlow database schema, including table definitions, relationships, and sample queries.

## Overview

AgentFlow uses a PostgreSQL database (via Supabase) to store various types of data, including:

- User information
- Credentials and API keys
- Task and workflow data
- Report and insight data
- Health monitoring data

## Table Definitions

### Core Tables

#### `users`

Stores user information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `varchar` | Primary key |
| `email` | `varchar` | User email (unique) |
| `firstName` | `varchar` | User's first name |
| `lastName` | `varchar` | User's last name |
| `profileImageUrl` | `varchar` | URL to profile image |
| `createdAt` | `timestamp` | Creation timestamp |
| `updatedAt` | `timestamp` | Last update timestamp |

#### `sessions`

Stores session information for authentication.

| Column | Type | Description |
|--------|------|-------------|
| `sid` | `varchar` | Primary key (session ID) |
| `sess` | `jsonb` | Session data |
| `expire` | `timestamp` | Expiration timestamp |

#### `credentials`

Stores encrypted credentials for various platforms.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `userId` | `varchar` | Foreign key to users.id |
| `platform` | `varchar` | Platform name (e.g., 'vinsolutions') |
| `label` | `varchar` | User-friendly label |
| `encryptedData` | `text` | Encrypted credential data |
| `iv` | `text` | Initialization vector for AES |
| `refreshToken` | `text` | OAuth refresh token (if applicable) |
| `refreshTokenExpiry` | `timestamp` | Refresh token expiry |
| `active` | `boolean` | Whether credential is active |
| `createdAt` | `timestamp` | Creation timestamp |
| `updatedAt` | `timestamp` | Last update timestamp |

#### `apiKeys`

Stores API keys for external services.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `varchar` | Primary key |
| `keyName` | `varchar` | Key name (unique) |
| `keyValue` | `text` | API key value |
| `active` | `boolean` | Whether key is active |
| `createdAt` | `timestamp` | Creation timestamp |
| `updatedAt` | `timestamp` | Last update timestamp |

### Task and Workflow Tables

#### `taskLogs`

Logs task execution.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `userId` | `varchar` | Foreign key to users.id |
| `taskType` | `varchar` | Type of task |
| `input` | `jsonb` | Task input data |
| `output` | `jsonb` | Task output data |
| `status` | `varchar` | Task status |
| `error` | `text` | Error message (if any) |
| `startTime` | `timestamp` | Start timestamp |
| `endTime` | `timestamp` | End timestamp |
| `createdAt` | `timestamp` | Creation timestamp |

#### `workflows`

Stores workflow definitions and state.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `userId` | `varchar` | Foreign key to users.id |
| `steps` | `jsonb` | JSON array of step definitions |
| `currentStep` | `integer` | Current step index |
| `context` | `jsonb` | Accumulated context/memory |
| `status` | `varchar` | Workflow status |
| `lastError` | `text` | Last error message |
| `lastUpdated` | `timestamp` | Last update timestamp |
| `locked` | `boolean` | Concurrency guard |
| `lockedAt` | `timestamp` | Lock timestamp |
| `createdAt` | `timestamp` | Creation timestamp |

#### `schedules`

Stores scheduled workflow execution.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `workflowId` | `uuid` | Foreign key to workflows.id |
| `cron` | `text` | Cron expression |
| `lastRun` | `timestamp` | Last run timestamp |
| `nextRun` | `timestamp` | Next run timestamp |
| `active` | `boolean` | Whether schedule is active |
| `createdAt` | `timestamp` | Creation timestamp |
| `updatedAt` | `timestamp` | Last update timestamp |

### Report and Insight Tables

#### `reports`

Stores processed report data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `userId` | `varchar` | Foreign key to users.id |
| `vendor` | `varchar` | Vendor name (e.g., 'VinSolutions') |
| `reportType` | `varchar` | Report type |
| `reportDate` | `timestamp` | Report date |
| `filePath` | `text` | Path to stored file |
| `reportData` | `jsonb` | Processed report data |
| `metadata` | `jsonb` | Additional metadata |
| `createdAt` | `timestamp` | Creation timestamp |
| `updatedAt` | `timestamp` | Last update timestamp |

#### `insights`

Stores generated insights.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `reportId` | `uuid` | Foreign key to reports.id |
| `insightType` | `varchar` | Type of insight |
| `content` | `jsonb` | Insight content |
| `score` | `integer` | Quality score (0-100) |
| `metadata` | `jsonb` | Additional metadata |
| `createdAt` | `timestamp` | Creation timestamp |

#### `insightDistributions`

Tracks distribution of insights.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `insightId` | `uuid` | Foreign key to insights.id |
| `recipientType` | `varchar` | Type of recipient (e.g., 'executive') |
| `recipientId` | `varchar` | Recipient identifier |
| `distributionMethod` | `varchar` | Method of distribution (e.g., 'email') |
| `status` | `varchar` | Distribution status |
| `sentAt` | `timestamp` | Sent timestamp |
| `createdAt` | `timestamp` | Creation timestamp |

### Email and Notification Tables

#### `emails`

Stores email messages.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `userId` | `varchar` | Foreign key to users.id |
| `subject` | `text` | Email subject |
| `body` | `text` | Email body |
| `recipients` | `jsonb` | Array of recipients |
| `attachments` | `jsonb` | Array of attachments |
| `status` | `varchar` | Email status |
| `sentAt` | `timestamp` | Sent timestamp |
| `createdAt` | `timestamp` | Creation timestamp |

#### `emailQueue`

Manages email sending queue.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `emailId` | `uuid` | Foreign key to emails.id |
| `priority` | `integer` | Send priority |
| `attempts` | `integer` | Number of send attempts |
| `lastAttempt` | `timestamp` | Last attempt timestamp |
| `status` | `varchar` | Queue status |
| `error` | `text` | Last error message |
| `createdAt` | `timestamp` | Creation timestamp |
| `updatedAt` | `timestamp` | Last update timestamp |

### Monitoring Tables

#### `healthChecks`

Stores health check status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `varchar` | Primary key (service identifier) |
| `name` | `varchar` | Service name |
| `status` | `varchar` | Health status |
| `responseTime` | `integer` | Response time in ms |
| `lastChecked` | `timestamp` | Last check timestamp |
| `message` | `text` | Status message |
| `details` | `text` | Detailed information |
| `createdAt` | `timestamp` | Creation timestamp |
| `updatedAt` | `timestamp` | Last update timestamp |

## Table Relationships

- `credentials.userId` → `users.id`
- `taskLogs.userId` → `users.id`
- `workflows.userId` → `users.id`
- `schedules.workflowId` → `workflows.id`
- `reports.userId` → `users.id`
- `insights.reportId` → `reports.id`
- `insightDistributions.insightId` → `insights.id`
- `emails.userId` → `users.id`
- `emailQueue.emailId` → `emails.id`

## Sample Queries

### Get Recent Task Logs

```sql
SELECT id, taskType, status, startTime, endTime
FROM task_logs
WHERE userId = 'user123'
ORDER BY startTime DESC
LIMIT 10;
```

### Get Active Workflows

```sql
SELECT id, currentStep, status, lastUpdated
FROM workflows
WHERE status = 'running' AND locked = true
ORDER BY lastUpdated DESC;
```

### Get Reports with Insights

```sql
SELECT r.id, r.vendor, r.reportType, r.reportDate, COUNT(i.id) as insightCount
FROM reports r
LEFT JOIN insights i ON r.id = i.reportId
WHERE r.userId = 'user123'
GROUP BY r.id, r.vendor, r.reportType, r.reportDate
ORDER BY r.reportDate DESC;
```

### Get Pending Emails

```sql
SELECT e.id, e.subject, e.recipients, eq.attempts, eq.priority
FROM emails e
JOIN email_queue eq ON e.id = eq.emailId
WHERE eq.status = 'pending'
ORDER BY eq.priority DESC, eq.createdAt ASC;
```

### Get Health Status Summary

```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) as healthy,
  SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warnings,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
FROM health_checks;
```
