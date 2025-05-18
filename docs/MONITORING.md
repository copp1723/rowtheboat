# Monitoring and Alerting System

This document describes the monitoring and alerting system implemented in the AgentFlow application.

## Overview

The monitoring system provides comprehensive visibility into the application's health, performance, and error rates. It integrates with external services like Sentry and DataDog for advanced monitoring capabilities, while also providing built-in dashboards and alerting.

## Components

### 1. Error Tracking with Sentry

Sentry is used for real-time error tracking and provides:

- Automatic capture of unhandled exceptions
- Detailed error context and stack traces
- Performance monitoring with tracing
- User context for error attribution

### 2. Performance Monitoring with DataDog

DataDog is used for performance monitoring and provides:

- APM (Application Performance Monitoring)
- Custom metrics tracking
- Resource usage monitoring (CPU, memory)
- Dashboard visualization

### 3. Health Check System

The built-in health check system monitors:

- Database connectivity
- Email service availability
- AI service status
- Scheduler service status
- IMAP connection status

### 4. Alerting System

The alerting system sends notifications when:

- Critical errors occur
- High error rates are detected
- Slow database queries are observed
- API response times exceed thresholds
- System resources are constrained

## Configuration

Monitoring configuration is managed through environment variables and the `src/config/monitoring.ts` file.

### Environment Variables

```
# Monitoring Enablement
MONITORING_ENABLED=true

# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=0.2
SENTRY_PROFILES_SAMPLE_RATE=0.1

# DataDog Configuration
DD_API_KEY=your-datadog-api-key
DD_APP_KEY=your-datadog-app-key
DD_SERVICE=agentflow
DD_AGENT_HOST=localhost
DD_METRIC_INTERVAL=10

# Alert Thresholds
ERROR_RATE_THRESHOLD=0.05
DB_QUERY_DURATION_THRESHOLD=1000
API_RESPONSE_TIME_THRESHOLD=2000
MEMORY_USAGE_THRESHOLD=800
CPU_USAGE_THRESHOLD=90

# Admin Emails for Alerts
ADMIN_EMAILS=admin@example.com,support@example.com
```

## Dashboards

The monitoring system provides several built-in dashboards:

### Health Dashboard

Endpoint: `/api/monitoring/health/summary`

Provides an overview of all system components and their current health status.

### Error Rates Dashboard

Endpoint: `/api/monitoring/dashboard/error-rates`

Shows error rates over time, with breakdowns by error type and component.

### Performance Dashboard

Endpoint: `/api/monitoring/dashboard/performance`

Displays performance metrics for API endpoints and database queries.

### Database Performance Dashboard

Endpoint: `/api/monitoring/dashboard/database`

Shows database query performance metrics and slow query analysis.

## Alert Procedures

### Critical Errors

When a critical error occurs:

1. An immediate alert is sent to all configured admin emails
2. The error is logged in Sentry with critical priority
3. The error is recorded in the application logs
4. A metric is incremented in DataDog

### High Error Rates

When the error rate exceeds the configured threshold:

1. An alert is sent to all configured admin emails
2. A warning is logged in the application logs
3. A metric is incremented in DataDog

### Slow Database Queries

When a database query exceeds the configured duration threshold:

1. The query is logged as a warning in the application logs
2. A metric is incremented in DataDog
3. The query is recorded for analysis

### API Response Time Alerts

When an API endpoint response time exceeds the configured threshold:

1. The endpoint is logged as a warning in the application logs
2. A metric is incremented in DataDog
3. The endpoint is recorded for analysis

## Escalation Path

For critical issues that require immediate attention:

1. Alerts are sent to all configured admin emails
2. If no response within 15 minutes, SMS alerts can be configured
3. For extended downtime (>30 minutes), on-call procedures should be followed

## Monitoring Best Practices

1. **Regular Review**: Review dashboards and alerts regularly to identify trends
2. **Threshold Tuning**: Adjust alert thresholds based on application patterns
3. **Alert Fatigue**: Avoid setting thresholds too low to prevent alert fatigue
4. **Documentation**: Document all alerts and their resolution steps
5. **Post-Mortems**: Conduct post-mortems for significant incidents

## Integration with CI/CD

The monitoring system integrates with CI/CD pipelines:

1. Deployment events are tracked in Sentry and DataDog
2. Release versions are tagged for correlation with errors
3. Health checks are run after deployments
4. Automatic rollback can be triggered on critical health check failures

## Extending the Monitoring System

To add new metrics or health checks:

1. Add new metrics in the appropriate service
2. Register new health checks with the health service
3. Update dashboards to include new metrics
4. Configure alerts for new metrics if needed

## Troubleshooting

If monitoring services are not working:

1. Check environment variables are correctly set
2. Verify network connectivity to Sentry and DataDog
3. Check application logs for initialization errors
4. Run health checks manually to verify functionality
