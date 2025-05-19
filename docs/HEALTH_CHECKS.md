# Health Check System

## Overview

The application includes a comprehensive health monitoring system that:
- Runs periodic checks on critical services
- Stores historical results for analysis
- Provides API endpoints for manual checks
- Integrates with monitoring dashboards

## Supported Checks

### Redis Health Check
- **Purpose**: Monitor Redis connectivity and performance
- **Checks**:
  - Connection establishment
  - Ping latency
  - Memory usage
- **Configuration**:
  ```env
  REDIS_HEALTH_CHECK_INTERVAL=15000
  REDIS_MAX_LATENCY=100
  ```

### Database Health Check
- **Purpose**: Monitor PostgreSQL connectivity and performance
- **Checks**:
  - Connection establishment
  - Simple query execution time
  - Connection pool status
- **Configuration**:
  ```env
  DB_HEALTH_CHECK_INTERVAL=30000
  DB_MAX_LATENCY=200
  ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HEALTH_CHECK_ENABLED` | Enable/disable all health checks | `true` |
| `HEALTH_CHECK_INTERVAL` | Base interval for checks (ms) | `30000` |
| `HEALTH_CHECK_TIMEOUT` | Timeout per check (ms) | `5000` |
| `HEALTH_CHECK_LOG_RESULTS` | Whether to log all results | `true` |

### Service-Specific Configuration

Each service can have its own:
- Check interval (overrides base interval)
- Timeout (overrides base timeout)
- Thresholds (e.g., max latency)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Run all health checks |
| `/health/:service` | GET | Run specific health check |
| `/health/results` | GET | Get latest results |
| `/health/history` | GET | Get historical results |

## Integration Points

1. **Monitoring Dashboards**:
   - Health status is exposed via Prometheus metrics
   - Grafana dashboards available for visualization

2. **Alerting**:
   - Failed checks trigger alerts via:
     - Email
     - Slack
     - PagerDuty

3. **Startup Probes**:
   - Kubernetes uses health endpoints for readiness/liveness

## Troubleshooting

### Common Issues

**False Positives**
- Adjust thresholds for latency/performance
- Increase timeout values if needed

**Missing Checks**
- Verify service is properly registered
- Check logs for registration errors

**Performance Impact**
- Increase check intervals
- Reduce check complexity

## Best Practices

1. **Production**:
   - Set conservative thresholds
   - Enable all alert channels
   - Monitor health check metrics

2. **Development**:
   - Disable non-critical checks
   - Increase intervals to reduce noise
   - Use mock services where possible

3. **Testing**:
   - Verify failure scenarios
   - Test alerting integrations
   - Validate dashboard displays
