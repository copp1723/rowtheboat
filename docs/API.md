# API Documentation

This document provides an overview of the AgentFlow API endpoints and how to use them.

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Task Management](#task-management)
4. [Workflow Management](#workflow-management)
5. [Job Management](#job-management)
6. [Health and Monitoring](#health-and-monitoring)
7. [Using the TypeScript SDK](#using-the-typescript-sdk)

## API Overview

The AgentFlow API provides endpoints for task submission, workflow management, job management, and system monitoring. The API is RESTful and uses JSON for request and response bodies.

### Base URL

- Development: `http://localhost:5000`
- Production: `https://api.agentflow.example.com`

### API Documentation

Interactive API documentation is available at `/api-docs` when the server is running.

## Authentication

Most API endpoints require authentication. The API uses JWT-based authentication.

### Authentication Endpoints

- `POST /api/auth/login` - Log in with username and password
- `POST /api/auth/refresh` - Refresh an expired token
- `POST /api/auth/logout` - Log out and invalidate the token

### Authentication Headers

Include the JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Task Management

Tasks are the core unit of work in AgentFlow. They represent natural language instructions that are parsed and executed by the system.

### Task Endpoints

- `POST /api/tasks` - Submit a new task
- `GET /api/tasks/:taskId` - Get task status and results
- `GET /api/tasks` - List all tasks
- `POST /submit-task` - Execute a task directly (synchronous)

### Submit a New Task

```http
POST /api/tasks
Content-Type: application/json

{
  "task": "Crawl https://news.ycombinator.com and extract the title, url, and score of the top 5 posts"
}
```

Response:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "jobId": "job-123456",
  "message": "Task submitted and enqueued successfully"
}
```

### Get Task Status

```http
GET /api/tasks/123e4567-e89b-12d3-a456-426614174000
```

Response:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-123",
  "taskType": "web_crawling",
  "taskText": "Crawl https://news.ycombinator.com and extract the title, url, and score of the top 5 posts",
  "taskData": {
    "url": "https://news.ycombinator.com",
    "count": 5
  },
  "status": "completed",
  "result": {
    "posts": [
      {
        "title": "Example Post",
        "url": "https://example.com",
        "score": 100
      }
    ]
  },
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:01:00.000Z"
}
```

### List All Tasks

```http
GET /api/tasks
```

Response:

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "user-123",
    "taskType": "web_crawling",
    "taskText": "Crawl https://news.ycombinator.com and extract the title, url, and score of the top 5 posts",
    "status": "completed",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Execute Task Directly

```http
POST /submit-task
Content-Type: application/json

{
  "task": "Crawl https://news.ycombinator.com and extract the title, url, and score of the top 5 posts"
}
```

Response:

```json
{
  "result": {
    "posts": [
      {
        "title": "Example Post",
        "url": "https://example.com",
        "score": 100
      }
    ]
  },
  "status": "success"
}
```

## Workflow Management

Workflows are sequences of tasks that are executed in order, with the output of one task feeding into the next.

### Workflow Endpoints

- `POST /api/workflows` - Create a new workflow
- `GET /api/workflows/:workflowId` - Get workflow status and results
- `GET /api/workflows` - List all workflows
- `PUT /api/workflows/:workflowId` - Update a workflow
- `DELETE /api/workflows/:workflowId` - Delete a workflow

## Job Management

Jobs are the execution units for tasks and workflows. They are managed by the job queue.

### Job Endpoints

- `GET /api/jobs/:jobId` - Get job status and results
- `GET /api/jobs` - List all jobs
- `POST /api/jobs/:jobId/cancel` - Cancel a job
- `POST /api/jobs/:jobId/retry` - Retry a failed job

## Health and Monitoring

Health and monitoring endpoints provide information about the system's health and performance.

### Health and Monitoring Endpoints

- `GET /api/health` - Basic health check
- `GET /api/performance` - Performance metrics
- `GET /api/monitoring/health/summary` - Monitoring dashboard summary
- `GET /api/monitoring/dashboard/error-rates` - Error rates dashboard

### Health Check

```http
GET /api/health
```

Response:

```json
{
  "status": "up",
  "version": "1.0.0",
  "message": "API server is running"
}
```

### Performance Metrics

```http
GET /api/performance
```

Response:

```json
{
  "performance": {
    "requestCount": 100,
    "averageResponseTime": 50,
    "maxResponseTime": 200,
    "minResponseTime": 10,
    "requestsPerEndpoint": {
      "GET /api/tasks": 50,
      "POST /api/tasks": 30
    }
  },
  "system": {
    "cpuUsage": 10.5,
    "memoryUsage": {
      "total": 8589934592,
      "free": 4294967296,
      "used": 4294967296,
      "percentUsed": 50
    },
    "loadAverage": [1.5, 1.2, 1.0],
    "uptime": 3600
  }
}
```

## Using the TypeScript SDK

The AgentFlow TypeScript SDK provides a convenient way to interact with the API from TypeScript/JavaScript applications.

### Installation

```bash
npm install agentflow-client
```

### Usage

```typescript
import { Configuration, TasksApi } from 'agentflow-client';

// Create a configuration with your API key or other authentication
const config = new Configuration({
  basePath: 'http://localhost:5000',
  accessToken: 'your-jwt-token'
});

// Create an instance of the API client
const tasksApi = new TasksApi(config);

// Submit a new task
async function submitTask() {
  try {
    const response = await tasksApi.submitTask({
      task: "Crawl https://news.ycombinator.com and extract the title, url, and score of the top 5 posts"
    });
    console.log('Task submitted:', response.data);
  } catch (error) {
    console.error('Error submitting task:', error);
  }
}

// Get task status
async function getTaskStatus(taskId) {
  try {
    const response = await tasksApi.getTaskStatus(taskId);
    console.log('Task status:', response.data);
  } catch (error) {
    console.error('Error getting task status:', error);
  }
}
```
