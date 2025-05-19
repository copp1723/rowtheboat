# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used in the Row The Boat application. Environment variables are used to configure the application for different environments and deployment scenarios.

## Table of Contents

1. [Core Configuration](#core-configuration)
2. [Database](#database)
3. [Redis](#redis)
4. [Health Checks](#health-checks)
5. [Security](#security)
6. [Logging](#logging)
7. [Email](#email)
8. [Third-Party Services](#third-party-services)
9. [Development](#development)
10. [Best Practices](#best-practices)
11. [Example Configuration](#example-configuration)

## Core Configuration

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `NODE_ENV` | Yes | - | Application environment: `development`, `test`, or `production` | `production` |
| `PORT` | No | `3000` | Application HTTP port | `5000` |
| `HOST` | No | `0.0.0.0` | Application host binding | `127.0.0.1` |

## Database

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `DB_HOST` | Yes | - | PostgreSQL host | `localhost` |
| `DB_PORT` | Yes | `5432` | PostgreSQL port | `5432` |
| `DB_USER` | Yes | - | Database user | `postgres` |
| `DB_PASSWORD` | Yes | - | Database password | `securepassword` |
| `DB_NAME` | Yes | - | Database name | `rowtheboat_db` |
| `DB_POOL_MIN` | No | `2` | Minimum connections | `5` |
| `DB_POOL_MAX` | No | `10` | Maximum connections | `20` |
| `DATABASE_URL` | No | - | Full connection string (alternative to individual settings) | `postgresql://user:password@localhost:5432/dbname` |

## Redis

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `REDIS_HOST` | Yes | - | Redis host | `localhost` |
| `REDIS_PORT` | Yes | `6379` | Redis port | `6379` |
| `REDIS_PASSWORD` | No | - | Redis password | `redispassword` |
| `REDIS_DB` | No | `0` | Redis database number | `1` |
| `REDIS_TLS` | No | `false` | Enable TLS | `true` |
| `REDIS_URL` | No | - | Full Redis connection string (alternative to individual settings) | `redis://user:password@localhost:6379/0` |

## Health Checks

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `HEALTH_CHECK_INTERVAL` | No | `30000` | Base check interval (ms) | `60000` |
| `HEALTH_CHECK_TIMEOUT` | No | `5000` | Check timeout (ms) | `10000` |
| `DB_HEALTH_CHECK_INTERVAL` | No | `30000` | DB check interval (ms) | `60000` |
| `REDIS_HEALTH_CHECK_INTERVAL` | No | `15000` | Redis check interval (ms) | `30000` |
| `DB_MAX_LATENCY` | No | `200` | Max DB latency (ms) | `500` |
| `REDIS_MAX_LATENCY` | No | `100` | Max Redis latency (ms) | `200` |
| `HEALTH_CHECK_PATH` | No | `/health` | Health check endpoint path | `/api/health` |

## Security

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `JWT_SECRET` | Yes | - | JWT signing key | `your-jwt-secret-key-at-least-32-chars` |
| `SESSION_SECRET` | Yes | - | Session secret | `your-session-secret-key-at-least-32-chars` |
| `ENCRYPTION_KEY` | Yes | - | Data encryption key (32 bytes) | `01234567890123456789012345678901` |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins (comma-separated) | `https://app.example.com,https://admin.example.com` |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limiting window in ms | `300000` |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window | `50` |
| `COOKIE_SECURE` | No | `true` | Require secure cookies | `false` |
| `COOKIE_SAME_SITE` | No | `lax` | SameSite cookie policy | `strict` |

## Logging

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `LOG_LEVEL` | No | `info` | Log level: `error`, `warn`, `info`, `debug`, `trace` | `debug` |
| `LOG_FORMAT` | No | `json` | Log format: `json` or `pretty` | `pretty` |
| `LOG_DIR` | No | `./logs` | Directory for log files | `/var/log/rowtheboat` |
| `SENTRY_DSN` | No | - | Sentry DSN for error tracking | `https://abcdef@sentry.io/123456` |
| `SENTRY_ENVIRONMENT` | No | `NODE_ENV` | Sentry environment | `staging` |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `0.2` | Sentry tracing sample rate (0-1) | `0.5` |
| `SENTRY_PROFILES_SAMPLE_RATE` | No | `0.1` | Sentry profiling sample rate (0-1) | `0.1` |
| `DATADOG_API_KEY` | No | - | DataDog API key | `abcdef123456` |
| `DATADOG_APP_KEY` | No | - | DataDog application key | `abcdef123456` |

## Email

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `SMTP_HOST` | No | - | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | No | `587` | SMTP port | `587` |
| `SMTP_USER` | No | - | SMTP username | `notifications@example.com` |
| `SMTP_PASSWORD` | No | - | SMTP password | `app-specific-password` |
| `EMAIL_FROM` | No | - | Sender email address | `"Row The Boat" <notifications@example.com>` |
| `EMAIL_SECURE` | No | `true` | Use TLS | `false` |
| `SENDGRID_API_KEY` | No | - | SendGrid API key (alternative to SMTP) | `SG.abcdefghijklmnopqrstuvwxyz` |
| `OTP_EMAIL_HOST` | No | - | IMAP server for OTP emails | `imap.gmail.com` |
| `OTP_EMAIL_PORT` | No | `993` | IMAP port for OTP emails | `993` |
| `OTP_EMAIL_USER` | No | - | Email for receiving OTPs | `otp@example.com` |
| `OTP_EMAIL_PASSWORD` | No | - | Password for OTP email | `app-specific-password` |
| `OTP_PATTERN` | No | `OTP is: (\\d{6})` | Regex pattern for OTP extraction | `Your code is: (\\d{6})` |
| `OTP_SUBJECT` | No | `Your OTP Code` | Subject line for OTP emails | `Verification Code` |

## Third-Party Services

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `OPENAI_API_KEY` | No | - | OpenAI API key | `sk-abcdefghijklmnopqrstuvwxyz` |
| `OPENAI_ORG_ID` | No | - | OpenAI organization ID | `org-abcdefghijklmnopqrstuvwxyz` |
| `OPENAI_MODEL` | No | `gpt-4o` | Default OpenAI model | `gpt-4-turbo` |
| `EKO_API_KEY` | No | - | Eko AI API key | `eko-abcdefghijklmnopqrstuvwxyz` |
| `AWS_ACCESS_KEY_ID` | No | - | AWS access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | No | - | AWS secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | No | `us-west-1` | AWS region | `us-east-1` |
| `AWS_S3_BUCKET` | No | - | S3 bucket for file storage | `rowtheboat-files` |
| `SUPABASE_URL` | No | - | Supabase project URL | `https://abcdefghijklm.supabase.co` |
| `SUPABASE_KEY` | No | - | Supabase service key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Development

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `DEBUG` | No | - | Enable debug logging (comma-separated modules) | `app:*,db:*` |
| `FORCE_IN_MEMORY_QUEUE` | No | `false` | Use in-memory queues instead of Redis | `true` |
| `SKIP_MIGRATIONS` | No | `false` | Skip DB migrations on startup | `true` |
| `MOCK_THIRD_PARTY_APIS` | No | `false` | Use mock implementations for third-party APIs | `true` |
| `DISABLE_RATE_LIMITING` | No | `false` | Disable rate limiting | `true` |
| `DISABLE_AUTHENTICATION` | No | `false` | Disable authentication (development only) | `true` |
| `SEED_DATABASE` | No | `false` | Seed database with test data on startup | `true` |

## Best Practices

1. **Production**:
   - Never commit `.env` files to version control
   - Use secure secret management (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Rotate keys and credentials regularly
   - Use different values for different environments
   - Set restrictive file permissions on `.env` files
   - Use environment-specific validation

2. **Development**:
   - Use `.env.example` as a template with safe default values
   - Document all new variables in this file
   - Keep sensitive values out of example files
   - Use `.env.local` for local overrides (add to .gitignore)
   - Consider using a local secrets manager

3. **Testing**:
   - Use `.env.test` for test-specific configuration
   - Use ephemeral resources for testing (test databases, etc.)
   - Reset test environment between test runs

## Example Configuration

Below is a minimal example configuration for development:

```bash
# Core
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rowtheboat_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=dev-jwt-secret-at-least-32-characters-long
SESSION_SECRET=dev-session-secret-at-least-32-characters
ENCRYPTION_KEY=01234567890123456789012345678901

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Email (optional for development)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password

# Third-party services (optional for development)
# OPENAI_API_KEY=your-openai-api-key
```

For a complete example with all variables, see the `.env.example` file in the project root.
