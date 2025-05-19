# Redis Configuration and Usage

This document describes how to configure and use Redis in the application, including setup, troubleshooting, and monitoring.

## Overview

Redis is used for multiple purposes in the application:
1. **Caching**: Store frequently accessed data to reduce database load
2. **Job Queues**: BullMQ uses Redis as a backend for processing background jobs
3. **Rate Limiting**: Store request counters for API rate limiting
4. **Session Storage**: Optional session store (if configured)
5. **Pub/Sub Messaging**: Real-time communication between services

The application includes a robust Redis connection service with health checks, automatic reconnection, and graceful degradation when Redis is unavailable. This ensures that the application remains operational even when Redis is temporarily unavailable.

## Configuration

### Required Settings

Configure these in your `.env` file:

```env
# Basic Connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Only if Redis requires authentication
REDIS_DB=0      # Database number (0-15)

# TLS Configuration (for production)
REDIS_TLS=false # Set to true for encrypted connections
REDIS_TLS_CA=   # Path to CA certificate if using self-signed certs
```

### Advanced Settings

```env
# Connection Pool
REDIS_POOL_MIN=5    # Minimum connections in pool
REDIS_POOL_MAX=20   # Maximum connections in pool

# Timeouts (milliseconds)
REDIS_CONNECT_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=3000

# Health Check
REDIS_HEALTH_CHECK_INTERVAL=15000  # Check every 15 seconds
REDIS_MAX_LATENCY=100              # Fail if response >100ms
```

### Configuration Options

| Option | Environment Variable | Default | Description |
|--------|---------------------|---------|-------------|
| Host | `REDIS_HOST` | `localhost` | Redis server hostname |
| Port | `REDIS_PORT` | `6379` | Redis server port |
| Password | `REDIS_PASSWORD` | `null` | Redis server password |
| Database | `REDIS_DB` | `0` | Redis database number |
| TLS | `REDIS_TLS` | `false` | Whether to use TLS for connection |
| Connection Timeout | `REDIS_CONNECT_TIMEOUT` | `5000` | Connection timeout in milliseconds |
| Command Timeout | `REDIS_COMMAND_TIMEOUT` | `3000` | Command timeout in milliseconds |
| Health Check Interval | `REDIS_HEALTH_CHECK_INTERVAL` | `15000` | Health check interval in milliseconds |
| Max Latency | `REDIS_MAX_LATENCY` | `100` | Maximum allowed latency in milliseconds |

## Health Monitoring

The system automatically monitors Redis health with:
- Periodic connectivity checks
- Latency measurements
- Memory usage monitoring

Health check results are available via:
- API endpoint: `GET /health/redis`
- Admin dashboard (if configured)
- Logs (search for 'redis_health')

## Best Practices

### Production Deployment
1. Use Redis Sentinel or Cluster for high availability
2. Enable TLS encryption
3. Set memory limits with `maxmemory` policy
4. Monitor memory usage and evictions

### Performance Tuning
1. Increase connection pool size for high throughput
2. Pipeline commands when possible
3. Use appropriate data structures (hashes vs strings)
4. Consider Redis modules like RedisJSON if needed

## Troubleshooting

### Diagnosing Redis Issues

When experiencing Redis-related issues, follow these steps to diagnose and resolve the problem:

#### 1. Check Application Logs

First, check the application logs for Redis-related events:

```
[2023-06-15T12:34:56.789Z] [INFO] 🔄 Initializing Redis service
[2023-06-15T12:34:56.850Z] [INFO] 🔌 Connecting to Redis at localhost:6379
[2023-06-15T12:34:56.900Z] [ERROR] ❌ Failed to connect to Redis
```

Look for events with these prefixes:
- `redis_service_initializing`
- `redis_connecting`
- `redis_connection_error`
- `redis_connection_timeout`

#### 2. Verify Redis Server Status

```bash
# Check if Redis is running
redis-cli ping
# Expected response: PONG

# Check Redis info
redis-cli info server
```

#### 3. Test Network Connectivity

```bash
# Using telnet
telnet redis-host 6379

# Using netcat
nc -vz redis-host 6379

# Check if port is open
sudo lsof -i :6379
```

#### 4. Verify Authentication

```bash
# Test with password
redis-cli -h redis-host -a your_password ping
# Expected response: PONG

# Test with URL
redis-cli -u redis://user:password@redis-host:6379 ping
```

### Common Issues and Solutions

#### Connection Failures

**Symptoms:**
- Application logs show `redis_connection_error` events
- Error message: `Error: connect ECONNREFUSED 127.0.0.1:6379`
- BullMQ jobs not processing

**Causes:**
- Redis server is not running
- Redis is running on a different host or port
- Firewall is blocking the connection

**Solutions:**
1. Start Redis server: `redis-server`
2. Verify Redis host and port in configuration
3. Check firewall settings: `sudo ufw status`
4. If using Docker, ensure port mapping is correct: `-p 6379:6379`

#### Authentication Errors

**Symptoms:**
- Error message: `WRONGPASS invalid username-password pair`
- Connection is established but immediately closed

**Solutions:**
1. Verify password in `.env` file or configuration
2. Check Redis configuration for `requirepass` setting
3. Test authentication manually: `redis-cli -a your_password ping`
4. Reset Redis password if necessary

#### High Latency

**Symptoms:**
- Slow application response times
- Redis commands taking longer than expected
- Health checks reporting high latency

**Solutions:**
1. Check Redis server load: `redis-cli info stats`
2. Monitor network latency between application and Redis
3. Optimize Redis configuration for performance
4. Consider Redis clustering for better load distribution
5. Use pipelining for batch operations

#### Memory Issues

**Symptoms:**
- Error message: `OOM command not allowed when used memory > 'maxmemory'`
- Redis rejecting write commands
- Unexpected key evictions

**Solutions:**
1. Increase Redis memory limit in `redis.conf`: `maxmemory 1gb`
2. Set appropriate eviction policy: `maxmemory-policy allkeys-lru`
3. Clean up unused keys: `redis-cli --scan --pattern "pattern:*" | xargs redis-cli del`
4. Monitor memory usage: `redis-cli info memory`
5. Implement key expiration for temporary data

## API Reference

Redis-related endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health/redis` | GET | Run Redis health check |
| `/redis/info` | GET | Get Redis server info |
| `/redis/config` | GET | View current configuration |

## Automatic Reconnection

If the Redis connection is lost, the application will automatically attempt to reconnect with exponential backoff:

1. Initial reconnect delay: 1 second
2. Maximum reconnect delay: 30 seconds
3. Maximum reconnect attempts: 10

## Graceful Degradation

The application is designed to continue functioning even when Redis is unavailable:

1. Job queues fall back to in-memory processing
2. Caching uses local memory instead of Redis
3. Rate limiting uses in-memory counters
4. Sessions fall back to cookie-based storage

This ensures that the application remains operational, albeit with reduced functionality, during Redis outages.

## Monitoring

Redis metrics are available through the monitoring dashboard:

1. Connection status
2. Response time
3. Command throughput
4. Memory usage
5. Error rates

## Redis CLI Commands

Useful Redis CLI commands for debugging and monitoring:

### Basic Commands

```bash
# Check Redis status
redis-cli ping

# Get Redis server info
redis-cli info

# Monitor Redis commands in real-time (CAUTION: high volume)
redis-cli monitor

# Check Redis server statistics
redis-cli info stats
```

### Memory Management

```bash
# Check memory usage
redis-cli info memory

# Find memory-intensive keys
redis-cli --bigkeys

# Get memory usage of a specific key
redis-cli memory usage key_name

# Set memory limit
redis-cli config set maxmemory 1gb

# Set eviction policy
redis-cli config set maxmemory-policy allkeys-lru
```

### Key Management

```bash
# List keys matching a pattern (CAUTION: slow on large DBs)
redis-cli keys "pattern:*"

# Count keys matching a pattern
redis-cli keys "pattern:*" | wc -l

# Delete keys matching a pattern (safer approach)
redis-cli --scan --pattern "pattern:*" | xargs redis-cli del

# Get key type
redis-cli type key_name

# Get key TTL (time to live)
redis-cli ttl key_name
```

### Queue Management

```bash
# Check queue length
redis-cli llen queue:name

# View queue items
redis-cli lrange queue:name 0 -1

# Check BullMQ job counts
redis-cli hgetall bull:queue_name:meta

# Check delayed jobs
redis-cli zrange bull:queue_name:delayed 0 -1 WITHSCORES
```

## Development Without Redis

For development without Redis:

1. Set `FORCE_IN_MEMORY_QUEUE=true` in your `.env` file
2. The application will use in-memory alternatives for all Redis functionality
