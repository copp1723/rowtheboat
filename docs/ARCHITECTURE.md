# AgentFlow Architecture

This document provides a comprehensive overview of the AgentFlow system architecture, including components, data flow, and integration points.

## System Overview

AgentFlow is a flexible AI agent backend that focuses on file ingestion, data processing, and insight generation. The system is designed to ingest files from various sources (primarily email), process them, and generate actionable insights for automotive dealerships.

## Core Components

### 1. Email Ingestion System

The email ingestion system connects to configured email accounts via IMAP to retrieve CRM reports sent as attachments. Key components include:

- **IMAP Connection Manager**: Handles connections to email servers with reconnection logic and exponential backoff
- **Email Filter Service**: Uses database-configured filters to identify relevant emails
- **Attachment Processor**: Downloads and validates attachments for further processing

### 2. Attachment Parsers

Specialized parsers for different file formats:

- **CSV Parser**: Processes comma-separated value files
- **XLSX Parser**: Processes Excel spreadsheets
- **PDF Parser**: Extracts data from PDF reports

### 3. Results Persistence

Stores processed data in both the filesystem and database:

- **File System Storage**: Organizes results by vendor and date
- **Database Storage**: Maintains structured data for querying and analysis

### 4. Insight Generator

Generates business insights from processed data:

- **Prompt Engine**: Manages specialized prompts for different data types
- **Quality Evaluator**: Scores insights based on actionability and relevance
- **Role Adapter**: Tailors insights for different stakeholder roles

### 5. Distribution System

Distributes insights to stakeholders:

- **Email Template Engine**: Renders email templates with insights
- **Distribution Service**: Manages recipient lists and delivery

### 6. Job Queue System

Manages asynchronous processing:

- **Queue Manager**: Handles job scheduling and execution
- **Worker Processes**: Executes jobs in the background
- **Retry Mechanism**: Implements exponential backoff for failed jobs

### 7. API Layer

Provides HTTP endpoints for interacting with the system:

- **Task Submission**: Endpoints for submitting tasks
- **Status Checking**: Endpoints for checking task status
- **Result Retrieval**: Endpoints for retrieving results

### 8. Security Layer

Ensures secure operation:

- **Environment Validator**: Validates environment variables
- **Encryption Service**: Encrypts sensitive data
- **Credential Manager**: Manages user-specific credentials

## Data Flow

The AgentFlow system follows this general data flow:

1. **Ingestion**: Email attachments are retrieved from configured email accounts
2. **Parsing**: Attachments are parsed based on their format (CSV, XLSX, PDF)
3. **Validation**: Parsed data is validated for completeness and correctness
4. **Storage**: Valid data is stored in the filesystem and database
5. **Analysis**: Stored data is analyzed to generate insights
6. **Distribution**: Insights are distributed to stakeholders via email

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Email     │     │  Attachment │     │   Results   │     │   Insight   │
│  Ingestion  │────▶│   Parsers   │────▶│ Persistence │────▶│  Generator  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                    │
                                                                    ▼
┌─────────────┐                                            ┌─────────────┐
│    API      │◀───────────────────────────────────────────│Distribution │
│    Layer    │                                            │   System    │
└─────────────┘                                            └─────────────┘
```

## Integration Points

### External Services

- **Email Servers**: IMAP/SMTP for email ingestion and sending
- **OpenAI API**: For generating insights from processed data
- **Supabase/PostgreSQL**: For data storage and retrieval

### Internal Integration

- **Job Queue**: Coordinates asynchronous processing between components
- **Event System**: Notifies components of state changes
- **Health Monitoring**: Tracks system health and performance

## Deployment Architecture

The system is designed to be deployed as a set of Node.js services:

- **API Server**: Handles HTTP requests
- **Worker Processes**: Process jobs from the queue
- **Scheduler**: Manages scheduled tasks
- **Health Monitor**: Monitors system health

## Security Architecture

- **Environment Variable Validation**: Prevents startup with insecure defaults
- **AES-GCM Encryption**: Secures sensitive data in the database
- **Per-User Credential Isolation**: Separates credentials by user
- **Security Audit Logging**: Tracks security-related events

## Error Handling and Resilience

- **Retry Mechanism**: Implements exponential backoff for transient failures
- **Circuit Breaker**: Prevents cascading failures
- **Health Checks**: Monitors system components
- **Alerting**: Notifies administrators of critical issues

## Scalability Considerations

- **Horizontal Scaling**: Worker processes can be scaled horizontally
- **Database Optimization**: Indexes and query optimization for performance
- **Rate Limiting**: Prevents resource exhaustion
- **Caching**: Reduces database load for frequent queries

## Future Architecture Considerations

- **Microservices**: Split monolith into specialized services
- **Containerization**: Package components as Docker containers
- **Kubernetes**: Orchestrate containers for scaling and resilience
- **Message Queue**: Replace direct communication with message-based architecture
